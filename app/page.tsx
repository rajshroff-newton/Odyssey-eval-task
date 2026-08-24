"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  REPORTS,
  TASK_ORDER,
  PORTRAITS,
  Q2_UNSOUND_REASONS,
  Q2_INSUFFICIENT_REASONS,
  reportWordCount,
  emptyRewriteSection,
  sectionsToMarkdown,
  sectionsWordCount,
  TaskKey,
  PortraitKey,
  ReportTask,
  RewriteSection,
} from "@/data/task";

type Step = "gate" | "task" | "done";
type Phase = "eval" | "rewrite";
type Score13 = 1 | 2 | 3;
type Publishability = "publishable" | "publishable_after_revision" | "not_publishable";
type BestFit = PortraitKey | "none";

// ---------- Draft (browser-local autosave) ----------

type Draft = {
  phase: Phase;
  q1Ratings: Record<PortraitKey, Score13 | null>;
  q1BestFit: BestFit | null;
  q1Note: string;
  q2Score: Score13 | null;
  q2Reason: string | null;
  q2Note: string;
  q3Steps: { s1: boolean | null; s2a: boolean | null; s2b: boolean | null; s3: boolean | null; s4: boolean | null };
  q4Score: Score13 | null;
  q4Note: string;
  q5: Publishability | null;
  rewritePortrait: PortraitKey | null;
  rewriteSections: RewriteSection[];
  dataFlag: boolean;
  dataFlagNote: string;
  attestationSignature: string;
};

function emptyDraft(): Draft {
  return {
    phase: "eval",
    q1Ratings: { G1: null, G2: null, G3: null },
    q1BestFit: null,
    q1Note: "",
    q2Score: null,
    q2Reason: null,
    q2Note: "",
    q3Steps: { s1: null, s2a: null, s2b: null, s3: null, s4: null },
    q4Score: null,
    q4Note: "",
    q5: null,
    rewritePortrait: null,
    rewriteSections: [emptyRewriteSection()],
    dataFlag: false,
    dataFlagNote: "",
    attestationSignature: "",
  };
}

function isDraft(d: unknown): d is Draft {
  if (!d || typeof d !== "object") return false;
  const v = d as Record<string, unknown>;
  return (
    (v.phase === "eval" || v.phase === "rewrite") &&
    !!v.q1Ratings &&
    !!v.q3Steps &&
    Array.isArray(v.rewriteSections)
  );
}

function draftKey(taskKey: TaskKey, email: string): string {
  return `odyssey3-draft:${taskKey}:${email.trim().toLowerCase()}`;
}

function doneKey(taskKey: TaskKey, email: string): string {
  return `odyssey3-done:${taskKey}:${email.trim().toLowerCase()}`;
}

function loadDraft(taskKey: TaskKey, email: string): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey(taskKey, email));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveDraft(taskKey: TaskKey, email: string, draft: Draft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(draftKey(taskKey, email), JSON.stringify(draft));
  } catch {
    // Autosave is a convenience; a storage failure must never break the task.
  }
}

function markDone(taskKey: TaskKey, email: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(doneKey(taskKey, email), "1");
  } catch {}
}

function isDone(taskKey: TaskKey, email: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(doneKey(taskKey, email)) === "1";
  } catch {
    return false;
  }
}

// ---------- Q3 derivation (sequential decision flow) ----------

function deriveQ3(steps: Draft["q3Steps"]): number | null {
  if (steps.s1 === null) return null;
  if (steps.s1 === false) return 1;
  if (steps.s2a === null || steps.s2b === null) return null;
  if (steps.s2a === false || steps.s2b === false) return 2;
  if (steps.s3 === null) return null;
  if (steps.s3 === false) return 3;
  if (steps.s4 === null) return null;
  return steps.s4 ? 5 : 4;
}

function q3Step2Tag(steps: Draft["q3Steps"]): string | null {
  if (steps.s2a === false && steps.s2b === false) return "both";
  if (steps.s2a === false) return "conclusion_survives_instrument_swap";
  if (steps.s2b === false) return "no_call_on_dominant_side";
  return null;
}

export default function Page() {
  const [step, setStep] = useState<Step>("gate");
  const [taskKey, setTaskKey] = useState<TaskKey>("sol");
  const [error, setError] = useState<string | null>(null);
  const [startingTask, setStartingTask] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [continuing, setContinuing] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const requiredAccessCode = process.env.NEXT_PUBLIC_TASK_ACCESS_CODE ?? "";

  const sessionIdRef = useRef<string | null>(null);
  const evalEventRecordedRef = useRef(false);

  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const report: ReportTask = REPORTS[taskKey];
  const originalWords = reportWordCount(report);
  const lowerBound = Math.ceil(originalWords * 0.8);
  const upperBound = originalWords < 150 ? 150 : Math.floor(originalWords * 1.2);
  const rewriteWords = sectionsWordCount(draft.rewriteSections);

  // ---------- Autosave ----------
  useEffect(() => {
    if (step !== "task") return;
    saveDraft(taskKey, email, draft);
  }, [step, taskKey, email, draft]);

  function patchDraft(patch: Partial<Draft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function addRewriteSection() {
    setDraft((prev) => ({
      ...prev,
      rewriteSections: [...prev.rewriteSections, emptyRewriteSection()],
    }));
  }

  function removeRewriteSection(index: number) {
    setDraft((prev) => {
      if (prev.rewriteSections.length <= 1) return prev;
      return {
        ...prev,
        rewriteSections: prev.rewriteSections.filter((_, i) => i !== index),
      };
    });
  }

  function updateRewriteSection(index: number, patch: Partial<RewriteSection>) {
    setDraft((prev) => ({
      ...prev,
      rewriteSections: prev.rewriteSections.map((s, i) =>
        i === index ? { ...s, ...patch } : s
      ),
    }));
  }

  // ---------- Validation ----------

  const q3Score = deriveQ3(draft.q3Steps);
  const q1NoteRequired =
    draft.q1BestFit === "none" ||
    (draft.q1Ratings.G1 !== null &&
      draft.q1Ratings.G2 !== null &&
      draft.q1Ratings.G3 !== null &&
      draft.q1Ratings.G1 < 3 &&
      draft.q1Ratings.G2 < 3 &&
      draft.q1Ratings.G3 < 3);

  const q2ReasonRequired = draft.q2Score !== null && draft.q2Score <= 2;
  const q2NoteRequired = draft.q2Score === 1;
  const q4NoteRequired = draft.q4Score === 1;

  const redLine =
    (draft.q2Score === 1 &&
      draft.q2Reason !== null &&
      Q2_UNSOUND_REASONS.includes(draft.q2Reason)) ||
    draft.q4Score === 1;

  const q5Consistent =
    draft.q5 === null
      ? true
      : redLine
        ? draft.q5 === "not_publishable"
        : draft.q5 !== "not_publishable";

  const evalComplete =
    draft.q1Ratings.G1 !== null &&
    draft.q1Ratings.G2 !== null &&
    draft.q1Ratings.G3 !== null &&
    draft.q1BestFit !== null &&
    (!q1NoteRequired || draft.q1Note.trim().length > 0) &&
    draft.q2Score !== null &&
    (!q2ReasonRequired || draft.q2Reason !== null) &&
    (!q2NoteRequired || draft.q2Note.trim().length > 0) &&
    q3Score !== null &&
    draft.q4Score !== null &&
    (!q4NoteRequired || draft.q4Note.trim().length > 0) &&
    draft.q5 !== null &&
    q5Consistent;

  const rewriteInBounds = rewriteWords >= lowerBound && rewriteWords <= upperBound;
  const rewriteSectionsFilledIn =
    draft.rewriteSections.length > 0 &&
    draft.rewriteSections.every(
      (s) =>
        s.heading.trim().length > 0 &&
        s.bullets.split("\n").some((b) => b.trim().length > 0)
    );
  const attestationMatches =
    draft.attestationSignature.trim().length > 0 &&
    draft.attestationSignature.trim().toLowerCase() === name.trim().toLowerCase();
  const rewriteComplete =
    draft.rewritePortrait !== null &&
    rewriteSectionsFilledIn &&
    rewriteInBounds &&
    (!draft.dataFlag || draft.dataFlagNote.trim().length > 0) &&
    attestationMatches;

  // ---------- Server actions ----------

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
      task_kind: "combined",
      task_id: report.taskId,
    });

    if (sessionError) {
      setStartingTask(false);
      setError(sessionError.message ?? "Couldn't start the task. Please try again.");
      return;
    }

    sessionIdRef.current = id;
    evalEventRecordedRef.current = false;

    // If a saved draft resumes straight into the rewrite phase, the whole of
    // this new session is rewrite time, so record the eval-complete marker
    // immediately (server timestamp).
    const existing = loadDraft(taskKey, email);
    if (existing) {
      setDraft(existing);
      if (existing.phase === "rewrite") {
        await recordEvalComplete(id);
      }
    } else {
      setDraft(emptyDraft());
    }

    setStartingTask(false);
    setStep("task");
  }

  async function recordEvalComplete(sessionId: string) {
    if (evalEventRecordedRef.current) return;
    const { error: eventError } = await supabase.from("session_events").insert({
      session_id: sessionId,
      event_type: "eval_complete",
    });
    if (!eventError) {
      evalEventRecordedRef.current = true;
    } else {
      // Non-fatal: the submission still lands; only phase-split timing is lost.
      console.warn("Could not record eval completion:", eventError.message);
    }
  }

  async function handleContinueToRewrite() {
    if (!evalComplete || !sessionIdRef.current) return;
    setContinuing(true);
    await recordEvalComplete(sessionIdRef.current);
    setContinuing(false);
    patchDraft({ phase: "rewrite" });
  }

  async function handleSubmit() {
    if (!rewriteComplete) return;
    setSubmitting(true);
    setError(null);

    const payload = {
      attempter_name: name.trim(),
      attempter_email: email.trim(),
      task_id: report.taskId,
      session_id: sessionIdRef.current,

      q1_g1: draft.q1Ratings.G1,
      q1_g2: draft.q1Ratings.G2,
      q1_g3: draft.q1Ratings.G3,
      q1_best_fit: draft.q1BestFit,
      q1_note: draft.q1Note.trim() || null,

      q2_score: draft.q2Score,
      q2_reason: draft.q2Reason,
      q2_note: draft.q2Note.trim() || null,

      q3_score: q3Score,
      q3_step2_tag: q3Step2Tag(draft.q3Steps),

      q4_score: draft.q4Score,
      q4_note: draft.q4Note.trim() || null,

      q5_publishability: draft.q5,

      rewrite_portrait: draft.rewritePortrait,
      rewrite_text: sectionsToMarkdown(draft.rewriteSections).trim(),
      rewrite_word_count: rewriteWords,
      original_word_count: originalWords,
      data_integrity_flag: draft.dataFlag,
      data_integrity_note: draft.dataFlag ? draft.dataFlagNote.trim() : null,

      no_ai_attestation_signature: draft.attestationSignature.trim(),
    };

    const { error: insertError } = await supabase
      .from("report_submissions")
      .insert(payload);

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    markDone(taskKey, email);
    setStep("done");
  }

  // ---------- Copy / paste guards ----------

  function blockCopyExceptFormFields(e: React.SyntheticEvent) {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    e.preventDefault();
  }

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
      onDrop={blockPaste}
      onDragOver={blockPaste}
    >
      <header className="border-b border-line pb-4">
        <p className="font-mono text-xs uppercase tracking-wider text-brass">
          Report task · {report.taskId}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">{report.title}</h1>
        <p className="mt-1 text-sm text-ink/60">
          {report.ticker} · {report.category} · generated {report.generatedAt}
        </p>
      </header>

      <div className="mt-4 rounded-lg border border-warn/40 bg-warn/5 px-4 py-3">
        <p className="text-sm font-semibold text-warn">
          No LLM or AI assistance of any kind is permitted on this task.
        </p>
        <p className="mt-0.5 text-sm text-ink/70">
          All scoring and writing must be your own, unassisted work. Using an
          LLM or any AI tool at any stage is grounds for removal from the
          project.
        </p>
      </div>

      {step === "gate" && (
        <GateScreen
          name={name}
          setName={setName}
          email={email}
          setEmail={setEmail}
          taskKey={taskKey}
          setTaskKey={setTaskKey}
          accessCode={accessCode}
          setAccessCode={setAccessCode}
          requiredAccessCode={requiredAccessCode}
          error={error}
          starting={startingTask}
          onStart={() => {
            setError(null);
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
            startSession();
          }}
        />
      )}

      {step === "task" && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[460px_1fr] lg:items-stretch">
          <div className="lg:h-[calc(100vh-11rem)] lg:overflow-y-auto lg:pr-1">
            <ReportPanel report={report} />
          </div>

          <div className="lg:h-[calc(100vh-11rem)] lg:overflow-y-auto lg:pr-1">
            {draft.phase === "eval" ? (
              <EvalForm
                draft={draft}
                patchDraft={patchDraft}
                q3Score={q3Score}
                q1NoteRequired={q1NoteRequired}
                q2ReasonRequired={q2ReasonRequired}
                q2NoteRequired={q2NoteRequired}
                q4NoteRequired={q4NoteRequired}
                redLine={redLine}
                q5Consistent={q5Consistent}
                evalComplete={evalComplete}
                continuing={continuing}
                onContinue={handleContinueToRewrite}
              />
            ) : (
              <RewriteForm
                draft={draft}
                patchDraft={patchDraft}
                addRewriteSection={addRewriteSection}
                removeRewriteSection={removeRewriteSection}
                updateRewriteSection={updateRewriteSection}
                name={name}
                attestationMatches={attestationMatches}
                originalWords={originalWords}
                lowerBound={lowerBound}
                upperBound={upperBound}
                rewriteWords={rewriteWords}
                rewriteInBounds={rewriteInBounds}
                rewriteComplete={rewriteComplete}
                submitting={submitting}
                error={error}
                onBackToEval={() => patchDraft({ phase: "eval" })}
                onSubmit={handleSubmit}
              />
            )}
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="mx-auto mt-10 max-w-md rounded-lg border border-line bg-white p-6 text-center">
          <h2 className="text-lg font-semibold">Submitted</h2>
          <p className="mt-2 text-sm text-ink/70">
            Your work on this report has been recorded. All three reports must
            be completed to join the project. To do another, reload this page
            and pick the next report.
          </p>
        </div>
      )}
    </main>
  );
}

// ---------- Gate ----------

function GateScreen({
  name,
  setName,
  email,
  setEmail,
  taskKey,
  setTaskKey,
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
  taskKey: TaskKey;
  setTaskKey: (t: TaskKey) => void;
  accessCode: string;
  setAccessCode: (v: string) => void;
  requiredAccessCode: string;
  error: string | null;
  starting: boolean;
  onStart: () => void;
}) {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-lg border border-line bg-white p-6">
      <h2 className="text-lg font-semibold">Before you start</h2>
      <p className="mt-2 text-sm text-ink/70">
        There are three reports: SOL, BTC, and Nasdaq. Each is one task that
        combines an evaluation and a full rewrite.{" "}
        <span className="font-medium text-ink">
          All three must be completed to join the project.
        </span>{" "}
        You choose the order; do them one at a time.
      </p>

      <label className="mt-5 block text-sm font-medium">Your name</label>
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
        Which report would you like to work on?
      </label>
      <select
        className="focus-ring mt-1 w-full rounded border border-line bg-white px-3 py-2 text-sm"
        value={taskKey}
        onChange={(e) => setTaskKey(e.target.value as TaskKey)}
      >
        {TASK_ORDER.map((key) => (
          <option key={key} value={key}>
            {REPORTS[key].label}
            {email && isDone(key, email) ? " ✓ submitted" : ""}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-ink/50">
        All three reports must be completed to join the project.
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

// ---------- Report panel ----------

function ReportPanel({ report }: { report: ReportTask }) {
  return (
    <div className="rounded-lg border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink/50">
          Report under evaluation
        </p>
      </div>
      <div className="px-4 py-3">
        {report.sections.map((s) => (
          <div key={s.heading} className="mb-5 last:mb-0">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-brass">
              {s.heading}
            </p>
            <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-ink/90">
              {s.body}
            </p>
          </div>
        ))}
        {/* Not visible to a human reader (Tailwind's standard sr-only
            pattern), but present in the DOM and in accessibility-tree
            snapshots that browser-automation agents commonly use to read
            a page. See ReportTask.canary in data/task.ts for why. */}
        <span className="sr-only">{report.canary}</span>
      </div>
    </div>
  );
}

// ---------- Shared bits ----------

function ScoreButtons({
  value,
  onChange,
  options,
}: {
  value: number | null;
  onChange: (n: number) => void;
  options: number[];
}) {
  return (
    <div className="mt-2 flex gap-2">
      {options.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`focus-ring flex h-9 w-9 items-center justify-center rounded border text-sm font-semibold ${
            value === n
              ? "border-brass bg-brass/10 text-brass"
              : "border-line text-ink/50 hover:border-ink/30"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function YesNo({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="mt-2 flex gap-2">
      <button
        onClick={() => onChange(true)}
        className={`focus-ring rounded border px-3 py-1 text-xs font-medium ${
          value === true ? "border-ok bg-ok/10 text-ok" : "border-line text-ink/40"
        }`}
      >
        Yes
      </button>
      <button
        onClick={() => onChange(false)}
        className={`focus-ring rounded border px-3 py-1 text-xs font-medium ${
          value === false ? "border-warn bg-warn/10 text-warn" : "border-line text-ink/40"
        }`}
      >
        No
      </button>
    </div>
  );
}

function PortraitReference() {
  return (
    <details className="mt-3 rounded border border-line bg-paper px-3 py-2">
      <summary className="cursor-pointer text-xs font-medium text-brass">
        Portrait reference (G1 / G2 / G3)
      </summary>
      <div className="mt-2 space-y-4">
        {PORTRAITS.map((p) => (
          <div key={p.key} className="border-b border-line pb-3 text-xs leading-relaxed text-ink/70 last:border-0">
            <p className="font-semibold text-ink">
              {p.label} · {p.band}
            </p>
            <p className="mt-1 italic">"{p.script}"</p>
            <p className="mt-1">
              <span className="font-medium">Wants:</span> {p.wants}
            </p>
            <p className="mt-1">
              <span className="font-medium">What loses them:</span> {p.loses}
            </p>
            <p className="mt-1">
              <span className="font-medium">Must be explained:</span> {p.mustExplain}
            </p>
            <p className="mt-1">
              <span className="font-medium">Actionability ceiling:</span> {p.actionCeiling}
            </p>
            <p className="mt-1">
              <span className="font-medium">Risk framing:</span> {p.riskFraming}
            </p>
          </div>
        ))}
      </div>
    </details>
  );
}

// ---------- Part A: Evaluation ----------

function EvalForm({
  draft,
  patchDraft,
  q3Score,
  q1NoteRequired,
  q2ReasonRequired,
  q2NoteRequired,
  q4NoteRequired,
  redLine,
  q5Consistent,
  evalComplete,
  continuing,
  onContinue,
}: {
  draft: Draft;
  patchDraft: (p: Partial<Draft>) => void;
  q3Score: number | null;
  q1NoteRequired: boolean;
  q2ReasonRequired: boolean;
  q2NoteRequired: boolean;
  q4NoteRequired: boolean;
  redLine: boolean;
  q5Consistent: boolean;
  evalComplete: boolean;
  continuing: boolean;
  onContinue: () => void;
}) {
  const steps = draft.q3Steps;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-base font-semibold">Part A · Evaluation</h2>
        <p className="mt-1 text-sm text-ink/60">
          Five fixed questions. Take every figure at face value; you are
          evaluating the reasoning and the reader fit, not verifying data
          externally. Format is not scored.
        </p>
        <PortraitReference />
      </div>

      {/* Q1 */}
      <div className="rounded-lg border border-line bg-white p-5">
        <h3 className="text-sm font-semibold">Q1 · Portrait fit (primary question)</h3>
        <p className="mt-1 text-sm text-ink/60">
          Who does this report actually serve? Rate it against each portrait
          independently. 3 = serves them well. 2 = usable but miscalibrated in
          one dimension. 1 = wrong reader.
        </p>

        {PORTRAITS.map((p) => (
          <div key={p.key} className="mt-4">
            <p className="text-sm font-medium">{p.label}</p>
            <ScoreButtons
              value={draft.q1Ratings[p.key]}
              onChange={(n) =>
                patchDraft({
                  q1Ratings: { ...draft.q1Ratings, [p.key]: n as Score13 },
                })
              }
              options={[1, 2, 3]}
            />
          </div>
        ))}

        <p className="mt-5 text-sm font-medium">Best fit (single select)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["G1", "G2", "G3", "none"] as BestFit[]).map((opt) => (
            <button
              key={opt}
              onClick={() => patchDraft({ q1BestFit: opt })}
              className={`focus-ring rounded border px-3 py-1.5 text-xs font-medium ${
                draft.q1BestFit === opt
                  ? "border-brass bg-brass/10 text-brass"
                  : "border-line text-ink/50 hover:border-ink/30"
              }`}
            >
              {opt === "none" ? "None of them" : opt}
            </button>
          ))}
        </div>

        {q1NoteRequired && (
          <>
            <label className="mt-4 block text-sm font-medium">
              Note (required): name who the report fails and what specifically
              causes it — a term, a sentence, an instruction
            </label>
            <textarea
              className="focus-ring mt-1 w-full rounded border border-line px-3 py-2 text-sm leading-relaxed"
              rows={3}
              value={draft.q1Note}
              onChange={(e) => patchDraft({ q1Note: e.target.value })}
            />
          </>
        )}
      </div>

      {/* Q2 */}
      <div className="rounded-lg border border-line bg-white p-5">
        <h3 className="text-sm font-semibold">
          Q2 · Analytical soundness and information value
        </h3>
        <p className="mt-1 text-sm text-ink/60">
          Portrait independent. Judged on the numbers as given — do not verify
          figures externally. 3 = causal chain holds. 2 = broadly holds but
          skips steps, or thin data recitation. 1 = reasoning does not hold, or
          hollow and templated. A score of 1 with an unsound-reasoning reason
          is a red line (FAIL).
        </p>
        <ScoreButtons
          value={draft.q2Score}
          onChange={(n) => patchDraft({ q2Score: n as Score13, q2Reason: null })}
          options={[1, 2, 3]}
        />

        {q2ReasonRequired && (
          <>
            <p className="mt-4 text-sm font-medium">Primary reason (single select)</p>
            <div className="mt-2 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-warn">
                Unsound reasoning (FAIL if scored 1)
              </p>
              {Q2_UNSOUND_REASONS.map((r) => (
                <ReasonOption
                  key={r}
                  label={r}
                  selected={draft.q2Reason === r}
                  onSelect={() => patchDraft({ q2Reason: r })}
                />
              ))}
              <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-ink/50">
                Insufficient information (low score only)
              </p>
              {Q2_INSUFFICIENT_REASONS.map((r) => (
                <ReasonOption
                  key={r}
                  label={r}
                  selected={draft.q2Reason === r}
                  onSelect={() => patchDraft({ q2Reason: r })}
                />
              ))}
            </div>
          </>
        )}

        {q2NoteRequired && (
          <>
            <label className="mt-4 block text-sm font-medium">
              Note (required): quote the step where the logic breaks
            </label>
            <textarea
              className="focus-ring mt-1 w-full rounded border border-line px-3 py-2 text-sm leading-relaxed"
              rows={3}
              value={draft.q2Note}
              onChange={(e) => patchDraft({ q2Note: e.target.value })}
            />
          </>
        )}
      </div>

      {/* Q3 */}
      <div className="rounded-lg border border-line bg-white p-5">
        <h3 className="text-sm font-semibold">Q3 · Viewpoint sharpness (1 to 5)</h3>
        <p className="mt-1 text-sm text-ink/60">
          Follow the decision flow step by step; it is sequential, so failing a
          step means you cannot skip ahead. This is an objective measure,
          independent of any reader.
        </p>

        <div className="mt-4">
          <p className="text-sm font-medium">
            Step 1. Does the report make any directional call? (Bullish,
            bearish, upside, downside, pressured, or dominant language AND
            causal reasoning.)
          </p>
          <YesNo
            value={steps.s1}
            onChange={(v) =>
              patchDraft({
                q3Steps: { s1: v, s2a: null, s2b: null, s3: null, s4: null },
              })
            }
          />
          {steps.s1 === false && (
            <p className="mt-1 text-xs text-brass">Score: 1 (Data Relay)</p>
          )}
        </div>

        {steps.s1 === true && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-sm font-medium">
              Step 2a. Swap in a comparable instrument — does the conclusion no
              longer hold? (i.e. there is instrument-specific logic)
            </p>
            <YesNo
              value={steps.s2a}
              onChange={(v) =>
                patchDraft({
                  q3Steps: { ...steps, s2a: v, s3: null, s4: null },
                })
              }
            />
            <p className="mt-3 text-sm font-medium">
              Step 2b. Does it explicitly state which side, bulls or bears, is
              dominant?
            </p>
            <YesNo
              value={steps.s2b}
              onChange={(v) =>
                patchDraft({
                  q3Steps: { ...steps, s2b: v, s3: null, s4: null },
                })
              }
            />
            {(steps.s2a === false || steps.s2b === false) && (
              <p className="mt-1 text-xs text-brass">Score: 2 (Safe Consensus)</p>
            )}
          </div>
        )}

        {steps.s1 === true && steps.s2a === true && steps.s2b === true && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-sm font-medium">
              Step 3. Are there verifiable boundary conditions? (If [indicator]
              hits [threshold] then [view changes]; specific price levels; time
              frame.)
            </p>
            <YesNo
              value={steps.s3}
              onChange={(v) => patchDraft({ q3Steps: { ...steps, s3: v, s4: null } })}
            />
            {steps.s3 === false && (
              <p className="mt-1 text-xs text-brass">Score: 3 (Committed but Unbounded)</p>
            )}
          </div>
        )}

        {steps.s1 === true &&
          steps.s2a === true &&
          steps.s2b === true &&
          steps.s3 === true && (
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-sm font-medium">
                Step 4. Does the report state a mispricing thesis? (It
                explicitly names a prevailing view and argues it is wrong: "the
                market says X, we think Y, because Z is being overlooked".)
                This is a structural test — check whether it names a consensus
                and argues against it, not whether that characterization is
                accurate.
              </p>
              <YesNo
                value={steps.s4}
                onChange={(v) => patchDraft({ q3Steps: { ...steps, s4: v } })}
              />
              {steps.s4 === false && (
                <p className="mt-1 text-xs text-brass">Score: 4 (Verifiable Judgment)</p>
              )}
              {steps.s4 === true && (
                <p className="mt-1 text-xs text-brass">Score: 5 (Sharp Insight)</p>
              )}
            </div>
          )}

        {q3Score !== null && (
          <p className="mt-4 rounded bg-paper px-3 py-2 text-sm font-semibold text-ink">
            Q3 sharpness score: {q3Score}
          </p>
        )}
      </div>

      {/* Q4 */}
      <div className="rounded-lg border border-line bg-white p-5">
        <h3 className="text-sm font-semibold">Q4 · Safety and compliance</h3>
        <p className="mt-1 text-sm text-ink/60">
          3 = fully compliant. 2 = borderline phrasing. 1 = clear violation
          (FAIL): unconditional buy or sell instruction, return promise,
          sensitive content, brand risk, or negative inducement. Conditional
          scenario reasoning ("if [condition] then [direction], target X, stop
          below Y") is an analytical framework, not investment advice — do not
          mark it as a violation.
        </p>
        <ScoreButtons
          value={draft.q4Score}
          onChange={(n) => patchDraft({ q4Score: n as Score13 })}
          options={[1, 2, 3]}
        />
        {q4NoteRequired && (
          <>
            <label className="mt-4 block text-sm font-medium">
              Note (required): quote the offending phrase
            </label>
            <textarea
              className="focus-ring mt-1 w-full rounded border border-line px-3 py-2 text-sm leading-relaxed"
              rows={2}
              value={draft.q4Note}
              onChange={(e) => patchDraft({ q4Note: e.target.value })}
            />
          </>
        )}
      </div>

      {/* Q5 */}
      <div className="rounded-lg border border-line bg-white p-5">
        <h3 className="text-sm font-semibold">Q5 · Overall publishability</h3>
        <p className="mt-1 text-sm text-ink/60">
          Can this report be published as is to the readers it best serves?
        </p>
        <div className="mt-3 space-y-2">
          {(
            [
              ["publishable", "Publishable — no red lines; serves at least one portrait well"],
              [
                "publishable_after_revision",
                "Publishable after revision — no red lines, but weak on Q1 or Q2",
              ],
              [
                "not_publishable",
                "Not publishable — triggers a red line (Q2 = 1 with unsound reasoning, or Q4 = 1)",
              ],
            ] as [Publishability, string][]
          ).map(([value, label]) => (
            <ReasonOption
              key={value}
              label={label}
              selected={draft.q5 === value}
              onSelect={() => patchDraft({ q5: value })}
            />
          ))}
        </div>
        {!q5Consistent && (
          <p className="mt-2 text-xs text-warn">
            {redLine
              ? "A red line fired (Q2 = 1 with unsound reasoning, or Q4 = 1), so this must be Not publishable."
              : "No red line fired, so Not publishable doesn't apply — red lines are the only trigger for it."}
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          disabled={!evalComplete || continuing}
          onClick={onContinue}
          className="focus-ring rounded bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {continuing ? "Saving…" : "Complete evaluation, continue to rewrite"}
        </button>
      </div>
    </div>
  );
}

function ReasonOption({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`focus-ring block w-full rounded border px-3 py-2 text-left text-sm ${
        selected
          ? "border-brass bg-brass/10 text-ink"
          : "border-line text-ink/70 hover:border-ink/30"
      }`}
    >
      {label}
    </button>
  );
}

// ---------- Part B: Track 2 full rewrite ----------

function RewriteForm({
  draft,
  patchDraft,
  addRewriteSection,
  removeRewriteSection,
  updateRewriteSection,
  name,
  attestationMatches,
  originalWords,
  lowerBound,
  upperBound,
  rewriteWords,
  rewriteInBounds,
  rewriteComplete,
  submitting,
  error,
  onBackToEval,
  onSubmit,
}: {
  draft: Draft;
  patchDraft: (p: Partial<Draft>) => void;
  addRewriteSection: () => void;
  removeRewriteSection: (index: number) => void;
  updateRewriteSection: (index: number, patch: Partial<RewriteSection>) => void;
  name: string;
  attestationMatches: boolean;
  originalWords: number;
  lowerBound: number;
  upperBound: number;
  rewriteWords: number;
  rewriteInBounds: boolean;
  rewriteComplete: boolean;
  submitting: boolean;
  error: string | null;
  onBackToEval: () => void;
  onSubmit: () => void;
}) {
  const chosen = PORTRAITS.find((p) => p.key === draft.rewritePortrait) ?? null;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-base font-semibold">Part B · Full rewrite (Track 2)</h2>
        <p className="mt-1 text-sm text-ink/60">
          Rewrite the entire report from scratch — not an edit, patch, or
          annotated version. Stay on the same instrument and the same
          underlying market situation. Do not invent data: only figures present
          in the original, or publicly verifiable data you cite with a source.
          Must pass Q4 compliance. Written by you, not by a model. Write it as
          a title followed by bullet points, repeated for as many sections as
          the rewrite needs — the same title/bullet-point structure the
          original report uses.
        </p>
        <PortraitReference />
      </div>

      <div className="rounded-lg border border-line bg-white p-5">
        <h3 className="text-sm font-semibold">
          Choose the portrait this report should serve
        </h3>
        <div className="mt-2 flex gap-2">
          {PORTRAITS.map((p) => (
            <button
              key={p.key}
              onClick={() => patchDraft({ rewritePortrait: p.key })}
              className={`focus-ring rounded border px-3 py-1.5 text-xs font-medium ${
                draft.rewritePortrait === p.key
                  ? "border-brass bg-brass/10 text-brass"
                  : "border-line text-ink/50 hover:border-ink/30"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {chosen && (
          <div className="mt-3 rounded border border-line bg-paper px-3 py-2 text-sm text-ink/70">
            <p className="font-medium text-ink">
              Your rewrite must land at {chosen.band}
            </p>
            <p className="mt-1">{chosen.rewriteMust}</p>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-line bg-white p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Your rewrite</h3>
          <span
            className={`font-mono text-xs ${
              rewriteInBounds ? "text-ok" : "text-warn"
            }`}
          >
            {rewriteWords} words · allowed {lowerBound}–{upperBound} (original{" "}
            {originalWords})
          </span>
        </div>
        <p className="mt-1 text-xs text-ink/50">
          One title and its bullet points per section — add as many sections
          as the rewrite needs. Length must be within plus or minus 20% of the
          original report's word count. Pasting is disabled; everything must
          be typed.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {draft.rewriteSections.map((section, i) => (
              <div key={i} className="rounded border border-line p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                    Section {i + 1}
                  </span>
                  {draft.rewriteSections.length > 1 && (
                    <button
                      onClick={() => removeRewriteSection(i)}
                      className="focus-ring text-xs text-ink/40 hover:text-warn"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  className="focus-ring mt-1 w-full rounded border border-line px-3 py-2 text-sm font-medium"
                  value={section.heading}
                  onChange={(e) => updateRewriteSection(i, { heading: e.target.value })}
                  placeholder="Section title, e.g. Core Conclusion"
                />
                <textarea
                  className="focus-ring mt-2 w-full rounded border border-line px-3 py-2 text-sm leading-relaxed"
                  rows={4}
                  value={section.bullets}
                  onChange={(e) => updateRewriteSection(i, { bullets: e.target.value })}
                  placeholder={"Every line automatically produces a bullet point."}
                />
              </div>
            ))}

            <button
              onClick={addRewriteSection}
              className="focus-ring rounded border border-line px-3 py-1.5 text-xs font-medium text-ink/70 hover:border-brass hover:text-brass"
            >
              + Add section
            </button>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
              Preview
            </p>
            <div className="mt-1 rounded border border-line bg-paper px-4 py-3">
              {draft.rewriteSections.every(
                (s) => !s.heading.trim() && !s.bullets.trim()
              ) ? (
                <p className="text-sm text-ink/40">
                  Your rewrite will preview here as you type.
                </p>
              ) : (
                draft.rewriteSections.map((section, i) => {
                  const bullets = section.bullets
                    .split("\n")
                    .map((b) => b.trim())
                    .filter(Boolean);
                  if (!section.heading.trim() && bullets.length === 0) return null;
                  return (
                    <div key={i} className="mb-4 last:mb-0">
                      <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-brass">
                        {section.heading.trim() || "(untitled section)"}
                      </p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-ink/90">
                        {bullets.map((b, bi) => (
                          <li key={bi}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={draft.dataFlag}
            onChange={(e) => patchDraft({ dataFlag: e.target.checked })}
          />
          <span>
            Data integrity flag: I believe a figure in the original is
            factually wrong or internally inconsistent
          </span>
        </label>
        {draft.dataFlag && (
          <textarea
            className="focus-ring mt-2 w-full rounded border border-line px-3 py-2 text-sm leading-relaxed"
            rows={2}
            value={draft.dataFlagNote}
            onChange={(e) => patchDraft({ dataFlagNote: e.target.value })}
            placeholder="Specify the figure and the problem."
          />
        )}
      </div>

      <div className="rounded-lg border border-warn/40 bg-warn/5 p-5">
        <h3 className="text-sm font-semibold text-warn">No-AI pledge (required)</h3>
        <p className="mt-1 text-sm text-ink/70">
          I pledge that I have not used an LLM or any AI tool, in any way, to
          complete this task — no scoring, no drafting, no editing, no
          phrasing suggestions. All work above is my own.
        </p>
        <label className="mt-3 block text-sm font-medium">
          Type your full name to sign
        </label>
        <input
          className="focus-ring mt-1 w-full rounded border border-line px-3 py-2 text-sm"
          value={draft.attestationSignature}
          onChange={(e) => patchDraft({ attestationSignature: e.target.value })}
          placeholder="Full name"
        />
        <p className="mt-1 text-xs text-ink/50">
          Must match the name you entered at the start ("{name || "..."}")
          exactly.
        </p>
        {draft.attestationSignature.trim().length > 0 && !attestationMatches && (
          <p className="mt-1 text-xs text-warn">
            Doesn't match the name you started with — check spelling.
          </p>
        )}
      </div>

      {error && <p className="text-sm text-warn">Couldn't submit: {error}</p>}

      <div className="flex justify-between">
        <button
          onClick={onBackToEval}
          className="focus-ring text-sm text-ink/60 hover:text-ink"
        >
          ← Back to evaluation
        </button>
        <button
          disabled={!rewriteComplete || submitting}
          onClick={onSubmit}
          className="focus-ring rounded bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {submitting ? "Submitting…" : "Submit task"}
        </button>
      </div>
    </div>
  );
}
