"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import {
  MODULES,
  DOMAIN_TASK_MODULE,
  TASK_IDS,
  PERSONAS,
  SUGGESTED_HEADINGS,
  CHECKLIST_EXAMPLE,
  PersonaKey,
  TaskKind,
  Domain,
  ModuleInfo,
} from "@/data/task";

type Step = "gate" | "task" | "done";

// ---------- Evaluation task config ----------

const SCORE_DIMENSIONS = [
  {
    key: "intent_recognition",
    label: "Intent recognition",
    help: "Is this what this persona, tapping this asset, actually wants to know? A relevance question, not an accuracy one — a flawless module can still miss what this persona specifically needs.",
  },
  {
    key: "authority",
    label: "Authority",
    help: "Does the content earn this persona's trust — internally consistent, conclusions the shown figures actually support, no invented certainty?",
  },
  {
    key: "utility",
    label: "Utility",
    help: "Could this persona act on this — clear levels or scenarios, diversity of evidence, language they specifically can follow?",
  },
] as const;

const SCORE_ANCHORS: Record<number, string> = {
  1: "Misleads or fails the reader outright",
  2: "Significant problems",
  3: "Mixed — usable with real gaps",
  4: "Solid, minor issues only",
  5: "Ship to users as is",
};

const MIN_JUSTIFICATION_LEN = 40;

type ScoreKey = (typeof SCORE_DIMENSIONS)[number]["key"];

// ---------- Golden rewrite task config ----------

type Section = { heading: string; bullets: string };

function emptyPersonaAnswers(): Record<PersonaKey, Section[]> {
  return {
    rookie: [{ heading: "", bullets: "" }],
    mid_tier: [{ heading: "", bullets: "" }],
    experienced: [{ heading: "", bullets: "" }],
  };
}

type ChecklistItem = { step: string; observations: string; conclusion: string };

function emptyChecklistItem(): ChecklistItem {
  return { step: "", observations: "", conclusion: "" };
}

function emptyPersonaChecklists(): Record<PersonaKey, ChecklistItem[]> {
  return {
    rookie: [emptyChecklistItem()],
    mid_tier: [emptyChecklistItem()],
    experienced: [emptyChecklistItem()],
  };
}

function personaAnswerIsComplete(sections: Section[]): boolean {
  return (
    sections.length > 0 &&
    sections.every(
      (s) => s.heading.trim().length > 0 && s.bullets.trim().length > 0
    )
  );
}

function checklistIsComplete(items: ChecklistItem[]): boolean {
  return (
    items.length > 0 &&
    items.every(
      (i) =>
        i.step.trim().length > 0 &&
        i.observations.trim().length > 0 &&
        i.conclusion.trim().length > 0
    )
  );
}

// ---------- Autosave / resume (browser-local only) ----------
// Keyed by task type + email, so the same browser can hold separate drafts
// per task and per person. This is stored in localStorage only — nothing
// server-side reads or writes it, so it never leaves this browser and
// doesn't follow someone to another device. Submitting doesn't clear it,
// so reopening the task after submitting still shows the same answer
// prefilled, ready to edit into a new attempt.

type EvalDraft = {
  personaScores: Record<PersonaKey, Record<ScoreKey, number>>;
  personaJustifications: Record<PersonaKey, Record<ScoreKey, string>>;
  feedbackNewDimensions: string;
};

type GoldenRewriteDraft = {
  personaAnswers: Record<PersonaKey, Section[]>;
  personaChecklists: Record<PersonaKey, ChecklistItem[]>;
};

function isEvalDraft(d: unknown): d is EvalDraft {
  if (!d || typeof d !== "object") return false;
  const v = d as Record<string, unknown>;
  const scores = v.personaScores as Record<string, unknown> | undefined;
  const justifications = v.personaJustifications as Record<string, unknown> | undefined;
  return (
    !!scores &&
    !!justifications &&
    !!scores.rookie &&
    !!justifications.rookie &&
    typeof v.feedbackNewDimensions === "string"
  );
}

function isGoldenRewriteDraft(d: unknown): d is GoldenRewriteDraft {
  if (!d || typeof d !== "object") return false;
  const v = d as Record<string, unknown>;
  const answers = v.personaAnswers as Record<string, unknown> | undefined;
  const checklists = v.personaChecklists as Record<string, unknown> | undefined;
  return (
    !!answers &&
    !!checklists &&
    Array.isArray(answers.rookie) &&
    Array.isArray(checklists.rookie)
  );
}

function draftKey(domain: Domain, taskKind: TaskKind, email: string): string {
  return `odyssey-draft:${domain}:${taskKind}:${email.trim().toLowerCase()}`;
}

function loadDraft<T>(
  domain: Domain,
  taskKind: TaskKind,
  email: string,
  isValid: (d: unknown) => d is T
): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey(domain, taskKind, email));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValid(parsed) ? parsed : null;
  } catch {
    // Malformed or stale draft (e.g. from an older version of this form) —
    // ignore it and start fresh rather than risk applying a broken shape.
    return null;
  }
}

function saveDraft(domain: Domain, taskKind: TaskKind, email: string, data: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(draftKey(domain, taskKind, email), JSON.stringify(data));
  } catch {
    // Autosave is a convenience — a write failure (storage full, disabled,
    // private browsing quirks) should never break the task itself.
  }
}

export default function Page() {
  const [step, setStep] = useState<Step>("gate");
  const [domain, setDomain] = useState<Domain>("traditional_finance");
  const [taskKind, setTaskKind] = useState<TaskKind>("evaluation");
  const [error, setError] = useState<string | null>(null);
  const [startingTask, setStartingTask] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");

  // Server-side timing: set once the session row is created; every timestamp
  // used for duration comes from Postgres's own clock, not the browser's.
  const sessionIdRef = useRef<string | null>(null);

  const requiredAccessCode = process.env.NEXT_PUBLIC_TASK_ACCESS_CODE ?? "";

  // Which module (and which task_id) this domain + task type maps to.
  // Traditional finance splits across two modules (Gold for Evaluation,
  // Energy for Golden rewrite); crypto uses BNB for both.
  const currentModuleKey = DOMAIN_TASK_MODULE[domain][taskKind];
  const currentModule: ModuleInfo = MODULES[currentModuleKey];
  const currentTaskId = TASK_IDS[domain][taskKind];

  // Evaluation state — all three personas are scored on every eval task
  // (confirmed with the client: not one persona per task), so each of the
  // three dimensions is scored and justified separately per persona.
  function emptyPersonaScores(): Record<PersonaKey, Record<ScoreKey, number>> {
    const dims = { intent_recognition: 3, authority: 3, utility: 3 } as Record<
      ScoreKey,
      number
    >;
    return { rookie: { ...dims }, mid_tier: { ...dims }, experienced: { ...dims } };
  }

  function emptyPersonaJustifications(): Record<PersonaKey, Record<ScoreKey, string>> {
    const dims = { intent_recognition: "", authority: "", utility: "" } as Record<
      ScoreKey,
      string
    >;
    return { rookie: { ...dims }, mid_tier: { ...dims }, experienced: { ...dims } };
  }

  const [personaScores, setPersonaScores] = useState<
    Record<PersonaKey, Record<ScoreKey, number>>
  >(emptyPersonaScores());
  const [personaJustifications, setPersonaJustifications] = useState<
    Record<PersonaKey, Record<ScoreKey, string>>
  >(emptyPersonaJustifications());
  const [feedbackNewDimensions, setFeedbackNewDimensions] = useState("");

  function setScore(persona: PersonaKey, dimension: ScoreKey, value: number) {
    setPersonaScores((prev) => ({
      ...prev,
      [persona]: { ...prev[persona], [dimension]: value },
    }));
  }

  function setJustification(persona: PersonaKey, dimension: ScoreKey, value: string) {
    setPersonaJustifications((prev) => ({
      ...prev,
      [persona]: { ...prev[persona], [dimension]: value },
    }));
  }

  const justificationsOk = PERSONAS.every((p) =>
    SCORE_DIMENSIONS.every(
      (d) => personaJustifications[p.key][d.key].trim().length >= MIN_JUSTIFICATION_LEN
    )
  );
  const canSubmitEval = justificationsOk;

  // Golden rewrite state
  const [personaAnswers, setPersonaAnswers] = useState<Record<PersonaKey, Section[]>>(
    emptyPersonaAnswers()
  );
  const [personaChecklists, setPersonaChecklists] = useState<Record<PersonaKey, ChecklistItem[]>>(
    emptyPersonaChecklists()
  );

  const canSubmitGoldenRewrite = PERSONAS.every(
    (p) =>
      checklistIsComplete(personaChecklists[p.key]) &&
      personaAnswerIsComplete(personaAnswers[p.key])
  );

  // Autosave (browser-local): while actively on the task screen, keep the
  // current answer mirrored into localStorage so reloading — or coming back
  // after submitting — picks up right where it left off.
  useEffect(() => {
    if (step !== "task" || taskKind !== "evaluation") return;
    saveDraft(domain, taskKind, email, {
      personaScores,
      personaJustifications,
      feedbackNewDimensions,
    } satisfies EvalDraft);
  }, [
    step,
    domain,
    taskKind,
    email,
    personaScores,
    personaJustifications,
    feedbackNewDimensions,
  ]);

  useEffect(() => {
    if (step !== "task" || taskKind !== "golden_rewrite") return;
    saveDraft(domain, taskKind, email, {
      personaAnswers,
      personaChecklists,
    } satisfies GoldenRewriteDraft);
  }, [step, domain, taskKind, email, personaAnswers, personaChecklists]);

  function addSection(persona: PersonaKey) {
    setPersonaAnswers((prev) => ({
      ...prev,
      [persona]: [...prev[persona], { heading: "", bullets: "" }],
    }));
  }

  function removeSection(persona: PersonaKey, index: number) {
    setPersonaAnswers((prev) => {
      const current = prev[persona];
      if (current.length <= 1) return prev;
      return { ...prev, [persona]: current.filter((_, i) => i !== index) };
    });
  }

  function updateSection(
    persona: PersonaKey,
    index: number,
    patch: Partial<Section>
  ) {
    setPersonaAnswers((prev) => {
      const current = prev[persona];
      const next = current.map((s, i) => (i === index ? { ...s, ...patch } : s));
      return { ...prev, [persona]: next };
    });
  }

  function addChecklistItem(persona: PersonaKey) {
    setPersonaChecklists((prev) => ({
      ...prev,
      [persona]: [...prev[persona], emptyChecklistItem()],
    }));
  }

  function removeChecklistItem(persona: PersonaKey, index: number) {
    setPersonaChecklists((prev) => {
      const current = prev[persona];
      if (current.length <= 1) return prev;
      return { ...prev, [persona]: current.filter((_, i) => i !== index) };
    });
  }

  function updateChecklistItem(
    persona: PersonaKey,
    index: number,
    patch: Partial<ChecklistItem>
  ) {
    setPersonaChecklists((prev) => {
      const current = prev[persona];
      const next = current.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      );
      return { ...prev, [persona]: next };
    });
  }

  async function startSession() {
    setStartingTask(true);
    setError(null);

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const { error: sessionError } = await supabase.from("task_sessions").insert({
      id,
      attempter_email: email.trim(),
      task_kind: taskKind,
      task_id: currentTaskId,
    });

    setStartingTask(false);

    if (sessionError) {
      setError(sessionError.message ?? "Couldn't start the task. Please try again.");
      return;
    }

    sessionIdRef.current = id;
    setStep("task");
  }

  async function handleSubmitEval() {
    setSubmitting(true);
    setError(null);

    function toScoresJson(persona: PersonaKey) {
      const scores = personaScores[persona];
      const justifications = personaJustifications[persona];
      const out: Record<string, { score: number; justification: string }> = {};
      for (const d of SCORE_DIMENSIONS) {
        out[d.key] = {
          score: scores[d.key],
          justification: justifications[d.key].trim(),
        };
      }
      return out;
    }

    const payload = {
      attempter_name: name.trim(),
      attempter_email: email.trim(),
      task_id: currentTaskId,
      session_id: sessionIdRef.current,

      rookie_scores: toScoresJson("rookie"),
      mid_tier_scores: toScoresJson("mid_tier"),
      experienced_scores: toScoresJson("experienced"),

      feedback_new_dimensions: feedbackNewDimensions.trim() || null,
    };

    const { error: insertError } = await supabase
      .from("eval_submissions")
      .insert(payload);

    if (insertError) {
      setSubmitting(false);
      setError(insertError.message);
      return;
    }

    setSubmitting(false);
    setStep("done");
  }

  async function handleSubmitGoldenRewrite() {
    setSubmitting(true);
    setError(null);

    function toJsonAnswer(sections: Section[]) {
      return sections.map((s) => ({
        heading: s.heading.trim(),
        bullets: s.bullets
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      }));
    }

    function toJsonChecklist(items: ChecklistItem[]) {
      return items.map((i) => ({
        step: i.step.trim(),
        observations: i.observations.trim(),
        conclusion: i.conclusion.trim(),
      }));
    }

    const payload = {
      attempter_name: name.trim(),
      attempter_email: email.trim(),
      task_id: currentTaskId,
      session_id: sessionIdRef.current,

      rookie_answer: toJsonAnswer(personaAnswers.rookie),
      mid_tier_answer: toJsonAnswer(personaAnswers.mid_tier),
      experienced_answer: toJsonAnswer(personaAnswers.experienced),

      rookie_checklist: toJsonChecklist(personaChecklists.rookie),
      mid_tier_checklist: toJsonChecklist(personaChecklists.mid_tier),
      experienced_checklist: toJsonChecklist(personaChecklists.experienced),
    };

    const { error: insertError } = await supabase
      .from("golden_rewrite_submissions")
      .insert(payload);

    if (insertError) {
      setSubmitting(false);
      setError(insertError.message);
      return;
    }

    setSubmitting(false);
    setStep("done");
  }

  // Blocks copy/cut/right-click/drag everywhere on the page except inside
  // actual form fields — someone can still copy what they themselves typed
  // out of an input or textarea, but can't copy instructions, definitions,
  // or the stimulus by right-clicking or selecting elsewhere on the page.
  function blockCopyExceptFormFields(e: React.SyntheticEvent) {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    e.preventDefault();
  }

  // Blocks paste everywhere, with no exemption. Paste only ever fires
  // inside an editable field to begin with (there's nothing to paste into
  // elsewhere on the page), so this forces every answer to be typed rather
  // than pasted in from somewhere else.
  function blockPaste(e: React.SyntheticEvent) {
    e.preventDefault();
  }

  return (
    <main
      className="mx-auto max-w-6xl select-none px-4 py-8 lg:px-8"
      onCopy={blockCopyExceptFormFields}
      onCut={blockCopyExceptFormFields}
      onContextMenu={blockCopyExceptFormFields}
      onDragStart={blockCopyExceptFormFields}
      onPaste={blockPaste}
    >
      <Header module={currentModule} taskKind={taskKind} taskId={currentTaskId} />

      {step === "gate" && (
        <GateScreen
          name={name}
          setName={setName}
          email={email}
          setEmail={setEmail}
          domain={domain}
          setDomain={setDomain}
          taskKind={taskKind}
          setTaskKind={setTaskKind}
          accessCode={accessCode}
          setAccessCode={setAccessCode}
          requiredAccessCode={requiredAccessCode}
          error={error}
          starting={startingTask}
          onStart={() => {
            if (requiredAccessCode && accessCode.trim() !== requiredAccessCode) {
              setError("Access code doesn't match. Check with the project team.");
              return;
            }
            if (!name.trim()) {
              setError("Enter your name before starting.");
              return;
            }
            if (!email.trim().includes("@") || !email.trim().includes(".")) {
              setError("Enter a valid email address before starting.");
              return;
            }

            if (taskKind === "evaluation") {
              const draft = loadDraft<EvalDraft>(domain, taskKind, email, isEvalDraft);
              if (draft) {
                setPersonaScores(draft.personaScores);
                setPersonaJustifications(draft.personaJustifications);
                setFeedbackNewDimensions(draft.feedbackNewDimensions);
              }
            } else {
              const draft = loadDraft<GoldenRewriteDraft>(
                domain,
                taskKind,
                email,
                isGoldenRewriteDraft
              );
              if (draft) {
                setPersonaAnswers(draft.personaAnswers);
                setPersonaChecklists(draft.personaChecklists);
              }
            }

            startSession();
          }}
        />
      )}

      {step === "task" && taskKind === "evaluation" && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr] lg:items-stretch">
          <div className="lg:h-[calc(100vh-11rem)] lg:overflow-y-auto lg:pr-1">
            <StimulusPanel module={currentModule} />
          </div>

          <div className="lg:h-[calc(100vh-11rem)] lg:overflow-y-auto lg:pr-1">
            <EvalTaskForm
              personaScores={personaScores}
              setScore={setScore}
              personaJustifications={personaJustifications}
              setJustification={setJustification}
              feedbackNewDimensions={feedbackNewDimensions}
              setFeedbackNewDimensions={setFeedbackNewDimensions}
              canSubmit={canSubmitEval}
              submitting={submitting}
              error={error}
              onSubmit={handleSubmitEval}
            />
          </div>
        </div>
      )}

      {step === "task" && taskKind === "golden_rewrite" && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr] lg:items-stretch">
          <div className="lg:h-[calc(100vh-11rem)] lg:overflow-y-auto lg:pr-1">
            <StimulusPanel module={currentModule} />
          </div>

          <div className="lg:h-[calc(100vh-11rem)] lg:overflow-y-auto lg:pr-1">
            <GoldenRewriteForm
              personaAnswers={personaAnswers}
              addSection={addSection}
              removeSection={removeSection}
              updateSection={updateSection}
              personaChecklists={personaChecklists}
              addChecklistItem={addChecklistItem}
              removeChecklistItem={removeChecklistItem}
              updateChecklistItem={updateChecklistItem}
              canSubmit={canSubmitGoldenRewrite}
              submitting={submitting}
              error={error}
              onSubmit={handleSubmitGoldenRewrite}
            />
          </div>
        </div>
      )}

      {step === "done" && <DoneScreen />}
    </main>
  );
}

function Header({
  module,
  taskKind,
  taskId,
}: {
  module: ModuleInfo;
  taskKind: TaskKind;
  taskId: string;
}) {
  const label = taskKind === "evaluation" ? "Evaluation" : "Golden rewrite";
  return (
    <header className="border-b border-line pb-4">
      <p className="font-mono text-xs uppercase tracking-wider text-brass">
        {label} task · {taskId}
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-ink">{module.module}</h1>
      <p className="mt-1 text-sm text-ink/60">
        {module.placement} · published {module.publishedAt}
      </p>
    </header>
  );
}

function GateScreen({
  name,
  setName,
  email,
  setEmail,
  domain,
  setDomain,
  taskKind,
  setTaskKind,
  accessCode,
  setAccessCode,
  requiredAccessCode,
  error,
  starting,
  onStart,
}: {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  domain: Domain;
  setDomain: (d: Domain) => void;
  taskKind: TaskKind;
  setTaskKind: (t: TaskKind) => void;
  accessCode: string;
  setAccessCode: (v: string) => void;
  requiredAccessCode: string;
  error: string | null;
  starting: boolean;
  onStart: () => void;
}) {
  const moduleNote =
    domain === "traditional_finance"
      ? "Traditional finance: Gold for Evaluation, Energy for Golden rewrite."
      : "Crypto: BNB for both tasks.";

  return (
    <div className="mx-auto mt-10 max-w-md rounded-lg border border-line bg-white p-6">
      <h2 className="text-lg font-semibold">Before you start</h2>
      <p className="mt-2 text-sm text-ink/70">
        Pick your domain, then whichever task you're doing next. Both tasks
        must be completed to join the project — you can do them in either
        order, one at a time.
      </p>

      <label className="mt-5 block text-sm font-medium">
        Are you crypto or traditional finance?
      </label>
      <select
        className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2 text-sm"
        value={domain}
        onChange={(e) => setDomain(e.target.value as Domain)}
      >
        <option value="traditional_finance">Traditional finance</option>
        <option value="crypto">Crypto</option>
      </select>
      <p className="mt-1 text-xs text-ink/50">{moduleNote}</p>

      <label className="mt-4 block text-sm font-medium">Your name</label>
      <input
        className="focus-ring mt-1 w-full rounded border border-line px-3 py-2 text-sm"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Full name"
      />

      <label className="mt-4 block text-sm font-medium">Your email</label>
      <input
        type="email"
        className="focus-ring mt-1 w-full rounded border border-line px-3 py-2 text-sm"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />

      <label className="mt-4 block text-sm font-medium">
        Which task would you like to do?
      </label>
      <select
        className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2 text-sm"
        value={taskKind}
        onChange={(e) => setTaskKind(e.target.value as TaskKind)}
      >
        <option value="evaluation">Evaluation</option>
        <option value="golden_rewrite">Golden rewrite</option>
      </select>
      <p className="mt-1 text-xs text-ink/50">
        Both tasks must be completed to join the project.
      </p>

      {requiredAccessCode && (
        <>
          <label className="mt-4 block text-sm font-medium">Access code</label>
          <input
            className="focus-ring mt-1 w-full rounded border border-line px-3 py-2 text-sm"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="Provided by project team"
          />
        </>
      )}

      {error && <p className="mt-3 text-sm text-warn">{error}</p>}

      <button
        disabled={starting}
        onClick={onStart}
        className="focus-ring mt-5 w-full rounded bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {starting ? "Starting…" : "Start task"}
      </button>
    </div>
  );
}

function StimulusPanel({ module }: { module: ModuleInfo }) {
  return (
    <div className="rounded-lg border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink/50">
          Stimulus
        </p>
      </div>

      <div className="flex justify-center bg-paper p-4">
        <Image
          src={module.screenshotSrc}
          alt={module.screenshotAlt}
          width={300}
          height={520}
          draggable={false}
          className="h-auto w-full max-w-[300px] rounded-xl border border-line"
        />
      </div>

      <div className="border-t border-line">
        <table className="w-full text-left text-sm">
          <tbody>
            {module.fields.map((f) => (
              <tr key={f.field} className="border-b border-line align-top">
                <td className="w-32 shrink-0 px-3 py-3 font-mono text-[11px] font-semibold uppercase tracking-wide text-brass">
                  {f.field}
                </td>
                <td className="whitespace-pre-line px-3 py-3 text-[13px] leading-relaxed text-ink/90">
                  {f.text}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Evaluation form ----------

function EvalTaskForm({
  personaScores,
  setScore,
  personaJustifications,
  setJustification,
  feedbackNewDimensions,
  setFeedbackNewDimensions,
  canSubmit,
  submitting,
  error,
  onSubmit,
}: {
  personaScores: Record<PersonaKey, Record<ScoreKey, number>>;
  setScore: (persona: PersonaKey, dimension: ScoreKey, value: number) => void;
  personaJustifications: Record<PersonaKey, Record<ScoreKey, string>>;
  setJustification: (persona: PersonaKey, dimension: ScoreKey, value: string) => void;
  feedbackNewDimensions: string;
  setFeedbackNewDimensions: (v: string) => void;
  canSubmit: boolean;
  submitting: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-base font-semibold">Score all three personas</h2>
        <p className="mt-1 text-sm text-ink/60">
          Score this module once per persona — intent recognition especially
          can land very differently depending on who's reading it, and
          utility often does too. 5 = ship to users as is. 1 = misleads or
          fails the reader outright. Justify each score with something
          specific — name the section and the figure or claim you're
          pointing to.
        </p>
      </div>

      {PERSONAS.map((persona) => (
        <div key={persona.key} className="rounded-lg border border-line bg-white p-5">
          <h3 className="text-base font-semibold">{persona.label}</h3>
          <p className="mt-1 rounded border border-line bg-paper px-3 py-2 text-sm text-ink/70">
            {persona.definition}
          </p>

          <div className="mt-5 space-y-6">
            {SCORE_DIMENSIONS.map((d) => {
              const score = personaScores[persona.key][d.key];
              const justification = personaJustifications[persona.key][d.key];
              return (
                <div key={d.key} className="border-b border-line pb-5 last:border-0">
                  <p className="text-sm font-medium">{d.label}</p>
                  <p className="mt-0.5 text-sm text-ink/60">{d.help}</p>
                  <div className="mt-3 flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setScore(persona.key, d.key, n)}
                        className={`focus-ring flex h-9 w-9 items-center justify-center rounded border text-sm font-semibold ${
                          score === n
                            ? "border-brass bg-brass/10 text-brass"
                            : "border-line text-ink/50 hover:border-ink/30"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-ink/40">{SCORE_ANCHORS[score]}</p>

                  <label className="mt-3 block text-sm font-medium">
                    Justify this score
                  </label>
                  <textarea
                    className="focus-ring mt-1 w-full rounded border border-line px-3 py-2 text-sm leading-relaxed"
                    rows={3}
                    value={justification}
                    onChange={(e) =>
                      setJustification(persona.key, d.key, e.target.value)
                    }
                    placeholder="Point to the specific line or figure and say why it drove this score."
                  />
                  <span
                    className={`mt-1 block text-right font-mono text-xs ${
                      justification.trim().length >= MIN_JUSTIFICATION_LEN
                        ? "text-ok"
                        : "text-ink/40"
                    }`}
                  >
                    {justification.trim().length}/{MIN_JUSTIFICATION_LEN}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-base font-semibold">Feedback</h2>

        <label className="mt-1 block text-sm font-medium">
          Should we score any additional dimensions? (optional)
        </label>
        <p className="mt-0.5 text-sm text-ink/60">
          If you think something isn't captured by intent recognition,
          authority, or utility, name the dimension and define it.
        </p>
        <textarea
          className="focus-ring mt-1 w-full rounded border border-line px-3 py-2 text-sm leading-relaxed"
          rows={4}
          value={feedbackNewDimensions}
          onChange={(e) => setFeedbackNewDimensions(e.target.value)}
          placeholder='e.g. "Tone calibration: whether the confidence of the language matches the confidence the data supports."'
        />
      </div>

      {error && <p className="text-sm text-warn">Couldn't submit: {error}</p>}

      <div className="flex justify-end">
        <button
          disabled={!canSubmit || submitting}
          onClick={onSubmit}
          className="focus-ring rounded bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {submitting ? "Submitting…" : "Submit task"}
        </button>
      </div>
    </div>
  );
}

// ---------- Golden rewrite form ----------

function GoldenRewriteForm({
  personaAnswers,
  addSection,
  removeSection,
  updateSection,
  personaChecklists,
  addChecklistItem,
  removeChecklistItem,
  updateChecklistItem,
  canSubmit,
  submitting,
  error,
  onSubmit,
}: {
  personaAnswers: Record<PersonaKey, Section[]>;
  addSection: (persona: PersonaKey) => void;
  removeSection: (persona: PersonaKey, index: number) => void;
  updateSection: (persona: PersonaKey, index: number, patch: Partial<Section>) => void;
  personaChecklists: Record<PersonaKey, ChecklistItem[]>;
  addChecklistItem: (persona: PersonaKey) => void;
  removeChecklistItem: (persona: PersonaKey, index: number) => void;
  updateChecklistItem: (
    persona: PersonaKey,
    index: number,
    patch: Partial<ChecklistItem>
  ) => void;
  canSubmit: boolean;
  submitting: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-base font-semibold">Write the improved answer, per persona</h2>
        <p className="mt-1 text-sm text-ink/60">
          For each persona: first write the reasoning checklist, then the
          rewrite itself as a heading followed by bullet points — Core
          Conclusion, then its bullets; Macro Analysis, then its bullets; and
          so on. Use the suggested headings or write your own if they fit the
          asset better. There's no fixed number of headings — use your own
          judgment for how many this asset and persona actually need.
        </p>
        <p className="mt-3 text-sm text-ink/60">
          A few starting points, not a rigid checklist — use judgment on how
          each applies to this asset and persona:
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink/60">
          <li>Verify every number against reliable external market data before using it.</li>
          <li>State risk plainly, in terms this persona can absorb.</li>
          <li>Make each persona's version clearly different in content and framing.</li>
          <li>Keep it about the length of the original module, or shorter.</li>
        </ul>
      </div>

      {PERSONAS.map((persona) => {
        const sections = personaAnswers[persona.key];
        const checklist = personaChecklists[persona.key];
        return (
          <div key={persona.key} className="rounded-lg border border-line bg-white p-5">
            <h3 className="text-base font-semibold">{persona.label}</h3>
            <p className="mt-1 rounded border border-line bg-paper px-3 py-2 text-sm text-ink/70">
              {persona.definition}
            </p>

            {/* Reasoning checklist */}
            <div className="mt-5 rounded border border-line p-4">
              <p className="text-sm font-semibold">Reasoning checklist</p>
              <p className="mt-1 text-sm text-ink/60">
                Before writing the answer below, walk through the analytical
                steps a competent analyst would actually take for this asset
                and this persona, in order. For each step, name the step,
                your Observations, and your Conclusion — this is graded on
                its own, since it shows how you got to the answer, not just
                the answer itself. A rookie checklist might include a step
                for explaining what an indicator means before using it; an
                experienced checklist usually wouldn't need that step.
              </p>

              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-brass">
                  Example checklist (different asset, for illustration only)
                </summary>
                <ol className="mt-2 space-y-3 pl-5 text-xs text-ink/60">
                  {CHECKLIST_EXAMPLE.map((item, i) => (
                    <li key={i} className="list-decimal">
                      <span className="font-medium text-ink/70">{item.step}</span>
                      <p className="mt-0.5">
                        <span className="font-semibold text-ink/50">Observations: </span>
                        {item.observations}
                      </p>
                      <p className="mt-0.5">
                        <span className="font-semibold text-ink/50">Conclusion: </span>
                        {item.conclusion}
                      </p>
                    </li>
                  ))}
                </ol>
              </details>

              <div className="mt-3 space-y-4">
                {checklist.map((item, i) => (
                  <div key={i} className="rounded border border-line p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                        Step {i + 1}
                      </span>
                      {checklist.length > 1 && (
                        <button
                          onClick={() => removeChecklistItem(persona.key, i)}
                          className="focus-ring text-xs text-ink/40 hover:text-warn"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      className="focus-ring mt-1 w-full rounded border border-line px-3 py-2 text-sm font-medium"
                      value={item.step}
                      onChange={(e) =>
                        updateChecklistItem(persona.key, i, { step: e.target.value })
                      }
                      placeholder="e.g. Evaluate price and volume movements since the last session"
                    />

                    <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-ink/50">
                      Observations
                    </label>
                    <textarea
                      className="focus-ring mt-1 w-full rounded border border-line px-3 py-2 text-sm leading-relaxed"
                      rows={2}
                      value={item.observations}
                      onChange={(e) =>
                        updateChecklistItem(persona.key, i, {
                          observations: e.target.value,
                        })
                      }
                      placeholder="e.g. Price moved +3.2% while volume increased by 15% relative to the 20-day average."
                    />

                    <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-ink/50">
                      Conclusion
                    </label>
                    <textarea
                      className="focus-ring mt-1 w-full rounded border border-line px-3 py-2 text-sm leading-relaxed"
                      rows={2}
                      value={item.conclusion}
                      onChange={(e) =>
                        updateChecklistItem(persona.key, i, {
                          conclusion: e.target.value,
                        })
                      }
                      placeholder="e.g. Strong buying demand confirmed by above-average volume — a firmer signal than a low-volume drift."
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={() => addChecklistItem(persona.key)}
                className="focus-ring mt-3 rounded border border-line px-3 py-1.5 text-xs font-medium text-ink/70 hover:border-brass hover:text-brass"
              >
                + Add reasoning step
              </button>
            </div>

            {/* Rewritten answer */}
            <div className="mt-6 border-t border-line pt-5">
              <p className="text-sm font-semibold">Rewritten answer</p>
              <p className="mt-1 text-sm text-ink/60">
                Now write the improved answer itself, as a heading followed
                by bullet points for each section.
              </p>
            </div>
            <div className="mt-3 space-y-4">
              {sections.map((section, i) => (
                <div key={i} className="rounded border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block flex-1 text-xs font-semibold uppercase tracking-wide text-ink/50">
                      Heading
                    </label>
                    {sections.length > 1 && (
                      <button
                        onClick={() => removeSection(persona.key, i)}
                        className="focus-ring text-xs text-ink/40 hover:text-warn"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    className="focus-ring mt-1 w-full rounded border border-line px-3 py-2 text-sm font-medium"
                    value={section.heading}
                    onChange={(e) =>
                      updateSection(persona.key, i, { heading: e.target.value })
                    }
                    placeholder={`e.g. ${SUGGESTED_HEADINGS[i] ?? "Section heading"}`}
                  />

                  <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-ink/50">
                    Bullet points — one per line
                  </label>
                  <textarea
                    className="focus-ring mt-1 w-full rounded border border-line px-3 py-2 text-sm leading-relaxed"
                    rows={3}
                    value={section.bullets}
                    onChange={(e) =>
                      updateSection(persona.key, i, { bullets: e.target.value })
                    }
                    placeholder={"e.g.\nBNB is up about 6% over the past month.\nThe last few days have been quieter."}
                  />

                  {(section.heading.trim() || section.bullets.trim()) && (
                    <div className="mt-3 rounded bg-paper p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-brass">
                        Preview
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {section.heading.trim() || "(heading)"}
                      </p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink/80">
                        {section.bullets
                          .split("\n")
                          .map((line) => line.trim())
                          .filter(Boolean)
                          .map((line, li) => (
                            <li key={li}>{line}</li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => addSection(persona.key)}
              className="focus-ring mt-3 rounded border border-line px-3 py-1.5 text-xs font-medium text-ink/70 hover:border-brass hover:text-brass"
            >
              + Add heading
            </button>
          </div>
        );
      })}

      {error && <p className="text-sm text-warn">Couldn't submit: {error}</p>}

      <div className="flex justify-end">
        <button
          disabled={!canSubmit || submitting}
          onClick={onSubmit}
          className="focus-ring rounded bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {submitting ? "Submitting…" : "Submit task"}
        </button>
      </div>
    </div>
  );
}

function DoneScreen() {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-lg border border-line bg-white p-6 text-center">
      <h2 className="text-lg font-semibold">Submitted</h2>
      <p className="mt-2 text-sm text-ink/70">
        Your work has been recorded. You can close this tab.
      </p>
    </div>
  );
}
