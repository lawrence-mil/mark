import { useParams } from "react-router-dom";
import { useSubmission } from "../hooks/useSubmission";
import { ProcessingStatus } from "../components/ProcessingStatus";
import { QuestionCard } from "../components/QuestionCard";

export function ResultsPage() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const { data, error, loading } = useSubmission(submissionId ?? null);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <p className="text-error text-sm font-mono">
          &gt; ERROR: {error}
        </p>
        <a href="/" className="btn btn-sm btn-outline">
          [ BACK TO HOME ]
        </a>
      </div>
    );
  }

  if (!data) return null;

  const isComplete = data.status === "completed";
  const scorePercent =
    data.totalScore != null && data.maxPossibleScore
      ? Math.round((data.totalScore / data.maxPossibleScore) * 100)
      : null;

  const gradeColor =
    scorePercent != null
      ? scorePercent >= 75
        ? "text-success"
        : scorePercent >= 50
          ? "text-warning"
          : "text-error"
      : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="font-mono space-y-1">
        <p className="text-xs opacity-40">
          &gt; Submission: {data.id}
        </p>
        {data.subject && (
          <p className="text-xs opacity-60">
            &gt; Subject: {data.subject}
            {data.examBoard && ` | Board: ${data.examBoard}`}
          </p>
        )}
      </div>

      {/* Processing or failed status */}
      {!isComplete && <ProcessingStatus status={data.status} />}

      {/* Results */}
      {isComplete && (
        <>
          {/* Score card */}
          <div className="card bg-base-200 border border-base-content/10">
            <div className="card-body text-center">
              <p className="text-xs opacity-40 uppercase tracking-widest">
                Total Score
              </p>
              <p className={`text-5xl font-bold font-mono ${gradeColor}`}>
                {data.totalScore}
                <span className="text-lg opacity-40">
                  /{data.maxPossibleScore}
                </span>
              </p>
              {scorePercent != null && (
                <p className={`text-sm font-mono ${gradeColor}`}>
                  {scorePercent}%
                </p>
              )}

              {/* Score bar */}
              {scorePercent != null && (
                <div className="w-full max-w-sm mx-auto mt-4">
                  <progress
                    className={`progress w-full ${
                      scorePercent >= 75
                        ? "progress-success"
                        : scorePercent >= 50
                          ? "progress-warning"
                          : "progress-error"
                    }`}
                    value={scorePercent}
                    max={100}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Question breakdown */}
          {data.questions && data.questions.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs opacity-40 font-mono uppercase tracking-wider">
                &gt; Question Breakdown
              </p>
              {data.questions
                .sort((a, b) => (a.questionNumber ?? 0) - (b.questionNumber ?? 0))
                .map((q, i) => (
                  <QuestionCard key={i} question={q} />
                ))}
            </div>
          )}

          {/* Share link */}
          <div className="card bg-base-200 border border-base-content/10">
            <div className="card-body">
              <p className="text-xs opacity-40 font-mono">
                &gt; Share this result:
              </p>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  readOnly
                  value={window.location.href}
                  className="input input-sm input-bordered flex-1 font-mono text-xs bg-base-300"
                />
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() =>
                    navigator.clipboard.writeText(window.location.href)
                  }
                >
                  COPY
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Back link */}
      <div className="text-center">
        <a href="/" className="text-xs opacity-40 hover:opacity-80 font-mono">
          &gt; grade another paper
        </a>
      </div>
    </div>
  );
}
