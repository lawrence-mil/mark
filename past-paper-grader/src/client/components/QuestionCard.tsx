import { Disclosure, Transition } from "@headlessui/react";
import type { QuestionResult } from "../../shared/types";

interface QuestionCardProps {
  question: QuestionResult;
}

export function QuestionCard({ question }: QuestionCardProps) {
  const scorePercent =
    question.score != null && question.maxScore
      ? Math.round((question.score / question.maxScore) * 100)
      : null;

  const scoreColor =
    scorePercent != null
      ? scorePercent >= 75
        ? "text-success"
        : scorePercent >= 50
          ? "text-warning"
          : "text-error"
      : "";

  return (
    <Disclosure>
      {({ open }) => (
        <div className="card bg-base-200 border border-base-content/10">
          <Disclosure.Button className="card-body cursor-pointer text-left hover:bg-base-content/5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs opacity-40 font-mono">
                  Q{question.questionNumber}
                </span>
                <span className="text-sm truncate max-w-md">
                  {question.questionText || `Question ${question.questionNumber}`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {question.score != null && question.maxScore != null && (
                  <span className={`font-mono font-bold text-sm ${scoreColor}`}>
                    {question.score}/{question.maxScore}
                  </span>
                )}
                <span
                  className={`text-xs opacity-40 transition-transform duration-200 ${
                    open ? "rotate-90" : ""
                  }`}
                >
                  &gt;
                </span>
              </div>
            </div>
          </Disclosure.Button>

          <Transition
            enter="transition duration-200 ease-out"
            enterFrom="transform opacity-0 -translate-y-1"
            enterTo="transform opacity-100 translate-y-0"
            leave="transition duration-150 ease-in"
            leaveFrom="transform opacity-100 translate-y-0"
            leaveTo="transform opacity-0 -translate-y-1"
          >
            <Disclosure.Panel className="border-t border-base-content/10 px-6 py-4 text-sm space-y-4">
              {question.studentAnswer && (
                <div>
                  <p className="text-xs font-semibold opacity-50 mb-1">
                    YOUR ANSWER:
                  </p>
                  <p className="text-xs opacity-80 whitespace-pre-wrap">
                    {question.studentAnswer}
                  </p>
                </div>
              )}

              {question.markschemeAnswer && (
                <div>
                  <p className="text-xs font-semibold opacity-50 mb-1">
                    MARK SCHEME:
                  </p>
                  <p className="text-xs opacity-80 whitespace-pre-wrap">
                    {question.markschemeAnswer}
                  </p>
                </div>
              )}

              {question.feedback && (
                <div>
                  <p className="text-xs font-semibold opacity-50 mb-1">
                    FEEDBACK:
                  </p>
                  <p className="text-xs opacity-80 whitespace-pre-wrap">
                    {question.feedback}
                  </p>
                </div>
              )}

              {question.improvementSuggestions && (
                <div>
                  <p className="text-xs font-semibold text-warning opacity-70 mb-1">
                    IMPROVEMENTS:
                  </p>
                  <p className="text-xs opacity-80 whitespace-pre-wrap">
                    {question.improvementSuggestions}
                  </p>
                </div>
              )}
            </Disclosure.Panel>
          </Transition>
        </div>
      )}
    </Disclosure>
  );
}
