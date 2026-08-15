"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { TASK } from "@/data/task";

type Step = "gate" | "task" | "done";

const SCORE_DIMENSIONS = [
  {
    key: "intent_recognition",
    label: "Intent recognition",
    help: "Is this what a retail reader who tapped this asset actually wants to know? A relevance question, not an accuracy one — a flawless module can still miss the reader's real questions.",
  },
  {
    key: "authority",
    label: "Authority",
    help: "Does the content earn trust — internally consistent, conclusions the shown figures actually support, no invented certainty?",
  },
  {
    key: "utility",
    label: "Utility",
    help: "Could the target reader act on this — clear levels or scenarios, diversity of evidence, language they can follow?",
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
const MIN_FEEDBACK_LEN = 40;

type ScoreKey = (typeof SCORE_DIMENSIONS)[number]["key"];

export default function Page() {
  const [step, setStep] = useState<Step>("gate");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const startTimeRef = useRef<number>(Date.now());

  const requiredAccessCode = process.env.NEXT_PUBLIC_TASK_ACCESS_CODE ?? "";

  const [scores, setScores] = useState<Record<ScoreKey, number>>({
    intent_recognition: 3,
    authority: 3,
    utility: 3,
  });
  const [justifications, setJustifications] = useState<Record<ScoreKey, string>>({
    intent_recognition: "",
    authority: "",
    utility: "",
  });

  const [feedbackGeneral, setFeedbackGeneral] = useState("");
  const [feedbackNewDimensions, setFeedbackNewDimensions] = useState("");

  const justificationsOk = SCORE_DIMENSIONS.every(
    (d) => justifications[d.key].trim().length >= MIN_JUSTIFICATION_LEN
  );
  const feedbackOk = feedbackGeneral.trim().length >= MIN_FEEDBACK_LEN;
  const canSubmit = justificationsOk && feedbackOk;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const totalSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    const payload = {
      attempter_name: name.trim(),
      attempter_email: email.trim(),
      task_id: TASK.taskId,

      score_intent_recognition: scores.intent_recognition,
      intent_recognition_justification: justifications.intent_recognition.trim(),

      score_authority: scores.authority,
      authority_justification: justifications.authority.trim(),

      score_utility: scores.utility,
      utility_justification: justifications.utility.trim(),

      feedback_general: feedbackGeneral.trim(),
      feedback_new_dimensions: feedbackNewDimensions.trim() || null,

      total_seconds: totalSeconds,
    };

    const { error: insertError } = await supabase
      .from("eval_submissions")
      .insert(payload);

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }
    setStep("done");
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <Header />

      {step === "gate" && (
        <GateScreen
          name={name}
          setName={setName}
          email={email}
          setEmail={setEmail}
          accessCode={accessCode}
          setAccessCode={setAccessCode}
          requiredAccessCode={requiredAccessCode}
          error={error}
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
            startTimeRef.current = Date.now();
            setStep("task");
          }}
        />
      )}

      {step === "task" && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr] lg:items-start">
          <div className="lg:sticky lg:top-6">
            <StimulusPanel />
          </div>

          <TaskForm
            scores={scores}
            setScores={setScores}
            justifications={justifications}
            setJustifications={setJustifications}
            feedbackGeneral={feedbackGeneral}
            setFeedbackGeneral={setFeedbackGeneral}
            feedbackNewDimensions={feedbackNewDimensions}
            setFeedbackNewDimensions={setFeedbackNewDimensions}
            canSubmit={canSubmit}
            submitting={submitting}
            error={error}
            onSubmit={handleSubmit}
          />
        </div>
      )}

      {step === "done" && <DoneScreen />}
    </main>
  );
}

function Header() {
  return (
    <header className="border-b border-line pb-4">
      <p className="font-mono text-xs uppercase tracking-wider text-brass">
        {TASK.taskType} task · {TASK.taskId}
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-ink">{TASK.module}</h1>
      <p className="mt-1 text-sm text-ink/60">
        {TASK.placement} · published {TASK.publishedAt}
      </p>
    </header>
  );
}

function GateScreen({
  name,
  setName,
  email,
  setEmail,
  accessCode,
  setAccessCode,
  requiredAccessCode,
  error,
  onStart,
}: {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  accessCode: string;
  setAccessCode: (v: string) => void;
  requiredAccessCode: string;
  error: string | null;
  onStart: () => void;
}) {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-lg border border-line bg-white p-6">
      <h2 className="text-lg font-semibold">Before you start</h2>
      <p className="mt-2 text-sm text-ink/70">
        You'll review the module, score it on three dimensions with a
        justification for each, and leave feedback at the end.
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
        onClick={onStart}
        className="focus-ring mt-5 w-full rounded bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90"
      >
        Start task
      </button>
    </div>
  );
}

function StimulusPanel() {
  return (
    <div className="rounded-lg border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink/50">
          Stimulus
        </p>
      </div>

      <div className="flex justify-center bg-paper p-4">
        <Image
          src={TASK.screenshotSrc}
          alt={TASK.screenshotAlt}
          width={300}
          height={520}
          className="h-auto w-full max-w-[300px] rounded-xl border border-line"
        />
      </div>

      <div className="max-h-[65vh] overflow-y-auto border-t border-line">
        <table className="w-full text-left text-sm">
          <tbody>
            {TASK.fields.map((f) => (
              <tr key={f.field} className="border-b border-line align-top">
                <td className="w-32 shrink-0 px-3 py-3 font-mono text-[11px] font-semibold uppercase tracking-wide text-brass">
                  {f.field}
                </td>
                <td className="px-3 py-3 text-[13px] leading-relaxed text-ink/90">
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

function TaskForm({
  scores,
  setScores,
  justifications,
  setJustifications,
  feedbackGeneral,
  setFeedbackGeneral,
  feedbackNewDimensions,
  setFeedbackNewDimensions,
  canSubmit,
  submitting,
  error,
  onSubmit,
}: {
  scores: Record<ScoreKey, number>;
  setScores: (s: Record<ScoreKey, number>) => void;
  justifications: Record<ScoreKey, string>;
  setJustifications: (j: Record<ScoreKey, string>) => void;
  feedbackGeneral: string;
  setFeedbackGeneral: (v: string) => void;
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
        <h2 className="text-base font-semibold">Score the three dimensions</h2>
        <p className="mt-1 text-sm text-ink/60">
          5 = ship to users as is. 1 = misleads or fails the reader outright.
          Justify each score with something specific — name the section and
          the figure or claim you're pointing to.
        </p>

        <div className="mt-5 space-y-6">
          {SCORE_DIMENSIONS.map((d) => (
            <div key={d.key} className="border-b border-line pb-5 last:border-0">
              <p className="text-sm font-medium">{d.label}</p>
              <p className="mt-0.5 text-sm text-ink/60">{d.help}</p>
              <div className="mt-3 flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setScores({ ...scores, [d.key]: n })}
                    className={`focus-ring flex h-9 w-9 items-center justify-center rounded border text-sm font-semibold ${
                      scores[d.key] === n
                        ? "border-brass bg-brass/10 text-brass"
                        : "border-line text-ink/50 hover:border-ink/30"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-ink/40">
                {SCORE_ANCHORS[scores[d.key]]}
              </p>

              <label className="mt-3 block text-sm font-medium">
                Justify this score
              </label>
              <textarea
                className="focus-ring mt-1 w-full rounded border border-line px-3 py-2 text-sm leading-relaxed"
                rows={3}
                value={justifications[d.key]}
                onChange={(e) =>
                  setJustifications({ ...justifications, [d.key]: e.target.value })
                }
                placeholder="Point to the specific line or figure and say why it drove this score."
              />
              <span
                className={`mt-1 block text-right font-mono text-xs ${
                  justifications[d.key].trim().length >= MIN_JUSTIFICATION_LEN
                    ? "text-ok"
                    : "text-ink/40"
                }`}
              >
                {justifications[d.key].trim().length}/{MIN_JUSTIFICATION_LEN}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-base font-semibold">Feedback</h2>

        <label className="mt-4 block text-sm font-medium">
          What worked well, and what would you do differently
        </label>
        <textarea
          className="focus-ring mt-1 w-full rounded border border-line px-3 py-2 text-sm leading-relaxed"
          rows={5}
          value={feedbackGeneral}
          onChange={(e) => setFeedbackGeneral(e.target.value)}
          placeholder="What did this module get right? What would you change, and how?"
        />
        <span
          className={`mt-1 block text-right font-mono text-xs ${
            feedbackGeneral.trim().length >= MIN_FEEDBACK_LEN ? "text-ok" : "text-ink/40"
          }`}
        >
          {feedbackGeneral.trim().length}/{MIN_FEEDBACK_LEN}
        </span>

        <label className="mt-5 block text-sm font-medium">
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

      {error && (
        <p className="text-sm text-warn">Couldn't submit: {error}</p>
      )}

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
        Your evaluation has been recorded. You can close this tab.
      </p>
    </div>
  );
}
