export type SubmissionStatus = "uploaded" | "processing" | "completed" | "failed";

export interface QuestionResult {
  questionNumber: number;
  questionText: string | null;
  studentAnswer: string | null;
  markschemeAnswer: string | null;
  score: number | null;
  maxScore: number | null;
  feedback: string | null;
  improvementSuggestions: string | null;
}

export interface SubmissionResult {
  id: string;
  createdAt: string;
  status: SubmissionStatus;
  totalScore: number | null;
  maxPossibleScore: number | null;
  subject: string | null;
  examBoard: string | null;
  paperDate: string | null;
  aiFeedback: unknown;
  questions: QuestionResult[] | null;
}

export interface UploadResponse {
  submissionId: string;
  status: SubmissionStatus;
}

export interface HealthStatus {
  status: "ok" | "degraded";
  timestamp: string;
  services: {
    db: boolean;
    redis: boolean;
    ocr: boolean;
    ai: boolean;
  };
}
