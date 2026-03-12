import { useCallback, useEffect, useRef, useState } from "react";
import { getResults } from "../lib/api";
import type { SubmissionResult } from "../../shared/types";

export function useSubmission(submissionId: string | null) {
  const [data, setData] = useState<SubmissionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fetchResults = useCallback(async (id: string) => {
    try {
      const result = await getResults(id);
      setData(result);
      setError(null);
      if (result.status === "completed" || result.status === "failed") {
        stopPolling();
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
      return null;
    }
  }, [stopPolling]);

  useEffect(() => {
    if (!submissionId) return;

    setLoading(true);
    fetchResults(submissionId).then(() => setLoading(false));

    // Poll every 2 seconds while processing
    intervalRef.current = setInterval(() => {
      fetchResults(submissionId);
    }, 2000);

    return stopPolling;
  }, [submissionId, fetchResults, stopPolling]);

  return { data, error, loading, refetch: () => submissionId && fetchResults(submissionId) };
}
