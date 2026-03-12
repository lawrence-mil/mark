import { useEffect, useState } from "react";
import type { SubmissionStatus } from "../../shared/types";

interface ProcessingStatusProps {
  status: SubmissionStatus;
}

const PROCESSING_LINES = [
  "Initializing OCR engine...",
  "Scanning paper document...",
  "Extracting text from pages...",
  "Analyzing mark scheme...",
  "Matching answers to rubric...",
  "Computing scores...",
  "Generating feedback...",
  "Finalizing results...",
];

export function ProcessingStatus({ status }: ProcessingStatusProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (status !== "processing") return;

    const lineTimer = setInterval(() => {
      setLineIndex((i) => (i + 1) % PROCESSING_LINES.length);
    }, 3000);

    const dotTimer = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);

    return () => {
      clearInterval(lineTimer);
      clearInterval(dotTimer);
    };
  }, [status]);

  if (status === "uploaded") {
    return (
      <div className="card bg-base-200">
        <div className="card-body">
          <p className="text-sm opacity-60">
            &gt; Submission uploaded. Waiting for processing to start...
          </p>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="card bg-error/10 border border-error/30">
        <div className="card-body">
          <p className="text-error text-sm font-semibold">
            &gt; ERROR: Processing failed
          </p>
          <p className="text-xs opacity-60">
            Something went wrong during grading. Please try again.
          </p>
        </div>
      </div>
    );
  }

  if (status === "processing") {
    return (
      <div className="card bg-base-200">
        <div className="card-body font-mono">
          <div className="flex items-center gap-2 mb-4">
            <span className="loading loading-spinner loading-sm text-primary" />
            <span className="text-primary text-sm font-semibold">
              PROCESSING
            </span>
          </div>

          <div className="space-y-1 text-xs">
            {PROCESSING_LINES.slice(0, lineIndex + 1).map((line, i) => (
              <p
                key={i}
                className={
                  i < lineIndex ? "text-success opacity-60" : "text-primary"
                }
              >
                {i < lineIndex ? "[OK]" : "[..]"} {line}
                {i === lineIndex && (
                  <span className="text-secondary">{dots}</span>
                )}
              </p>
            ))}
          </div>

          <progress className="progress progress-primary mt-4 w-full" />
        </div>
      </div>
    );
  }

  return null;
}
