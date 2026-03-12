import type { SubmissionResult, UploadResponse } from "../../shared/types";

const BASE = import.meta.env.VITE_API_URL || "/api";

export async function uploadPaper(files: File[] | File): Promise<UploadResponse> {
  const form = new FormData();
  const fileArray = Array.isArray(files) ? files : [files];
  fileArray.forEach(file => form.append("files", file));
  
  const res = await fetch(`${BASE}/submit/paper`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || "Upload failed");
  }
  return res.json();
}

export async function uploadMarkscheme(submissionId: string, file: File): Promise<{ success: boolean }> {
  const form = new FormData();
  form.append("submissionId", submissionId);
  form.append("file", file);
  const res = await fetch(`${BASE}/submit/markscheme`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || "Upload failed");
  }
  return res.json();
}

export async function detectMarkscheme(submissionId: string): Promise<{ found: boolean; metadata?: any; text?: string }> {
  const res = await fetch(`${BASE}/detect-markscheme/${submissionId}`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Detection failed" }));
    throw new Error(err.error || "Detection failed");
  }
  return res.json();
}

export async function triggerProcessing(submissionId: string): Promise<{ processing: boolean }> {
  const res = await fetch(`${BASE}/process/${submissionId}`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Processing failed" }));
    throw new Error(err.error || "Processing failed");
  }
  return res.json();
}

export async function getResults(submissionId: string): Promise<SubmissionResult> {
  const res = await fetch(`${BASE}/results/${submissionId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Not found" }));
    throw new Error(err.error || "Failed to fetch results");
  }
  return res.json();
}
