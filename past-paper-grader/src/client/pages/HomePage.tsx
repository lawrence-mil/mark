import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileDropzone } from "../components/FileDropzone";
import { uploadPaper, uploadMarkscheme, detectMarkscheme, triggerProcessing } from "../lib/api";
import posthog from "posthog-js";

type Step = "paper" | "detecting" | "markscheme" | "submitting";

export function HomePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("paper");
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paperName, setPaperName] = useState<string | null>(null);

  const handlePaperUpload = async (files: File[]) => {
    setUploading(true);
    setError(null);
    try {
      posthog.capture("paper_upload_started", { fileCount: files.length });
      const result = await uploadPaper(files);
      setSubmissionId(result.submissionId);
      setPaperName(files.length === 1 ? files[0].name : `${files.length} files uploaded`);
      
      setStep("detecting");
      posthog.capture("paper_upload_success", { submissionId: result.submissionId });
      
      // Attempt automatic mark scheme detection
      try {
        const detectResult = await detectMarkscheme(result.submissionId);
        if (detectResult.found) {
          posthog.capture("markscheme_auto_detected", { 
            submissionId: result.submissionId,
            metadata: detectResult.metadata 
          });
          setStep("submitting");
          await triggerProcessing(result.submissionId);
          navigate(`/${result.submissionId}`);
        } else {
          posthog.capture("markscheme_auto_detect_failed", { submissionId: result.submissionId });
          setStep("markscheme");
        }
      } catch (detectErr) {
        console.error("Detection error:", detectErr);
        posthog.capture("markscheme_auto_detect_error", { error: String(detectErr) });
        setStep("markscheme");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
      posthog.capture("paper_upload_error", { error: errorMessage });
    } finally {
      setUploading(false);
    }
  };

  const handleMarkschemeUpload = async (file: File) => {
    if (!submissionId) return;
    setUploading(true);
    setError(null);
    try {
      posthog.capture("markscheme_manual_upload_started", { submissionId });
      await uploadMarkscheme(submissionId, file);
      posthog.capture("markscheme_manual_upload_success", { submissionId });
      setStep("submitting");
      await triggerProcessing(submissionId);
      navigate(`/${submissionId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
      posthog.capture("markscheme_manual_upload_error", { error: errorMessage });
      setStep("markscheme");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Terminal welcome */}
      <div className="font-mono space-y-1">
        <p className="text-primary text-sm animate-typing">
          &gt; Welcome to PAPER_GRADER v1.0
        </p>
        <p className="text-xs opacity-50">
          &gt; Upload your past paper (multiple pages supported)
        </p>
        <p className="text-xs opacity-30">
          &gt; We'll automatically search for the mark scheme.
        </p>
      </div>

      {/* Steps indicator */}
      <ul className="steps steps-horizontal w-full text-xs">
        <li className={`step ${step === "paper" ? "step-primary" : "step-success"}`}>
          Upload Paper
        </li>
        <li className={`step ${step === "detecting" ? "step-primary" : (step === "markscheme" || step === "submitting" ? "step-success" : "")}`}>
          Find Mark Scheme
        </li>
        <li className={`step ${step === "submitting" ? "step-primary" : ""}`}>
          Processing
        </li>
      </ul>

      {/* Upload area */}
      {step === "paper" && (
        <FileDropzone
          onFiles={handlePaperUpload}
          multiple={true}
          label="Drop your past paper here"
          sublabel="Upload one or multiple images/PDFs of the student's answers"
          uploading={uploading}
        />
      )}

      {step === "detecting" && (
        <div className="card bg-base-200 border border-primary/20">
          <div className="card-body items-center py-12 text-center font-mono">
            <span className="loading loading-dots loading-lg text-primary mb-4" />
            <p className="text-sm text-primary mb-2">&gt; Analyzing paper content...</p>
            <p className="text-xs opacity-60">&gt; Searching web for official mark scheme...</p>
          </div>
        </div>
      )}

      {step === "markscheme" && (
        <div className="space-y-4 font-mono animate-fade-in">
          <div className="text-xs text-warning border-l-2 border-warning pl-3 py-1">
            &gt; Automatic mark scheme detection failed or returned low confidence.
            <br />&gt; Please upload the mark scheme manually.
          </div>
          {paperName && (
            <div className="text-xs text-success">
              &gt; Target: {paperName}
            </div>
          )}
          <FileDropzone
            onFile={handleMarkschemeUpload}
            multiple={false}
            label="Drop the mark scheme here"
            sublabel="Upload the official mark scheme PDF or text"
            uploading={uploading}
          />
        </div>
      )}

      {step === "submitting" && (
        <div className="card bg-base-200 border border-primary/20">
          <div className="card-body items-center py-12 text-center font-mono">
            <span className="loading loading-dots loading-lg text-primary mb-4" />
            <p className="text-sm text-primary mb-2">&gt; Initiating AI grading pipeline...</p>
            <p className="text-xs opacity-60">&gt; Comparing student answers against mark scheme criteria...</p>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="text-xs text-error font-mono mt-4 border-l-2 border-error pl-3 py-1">
          &gt; ERROR: {error}
        </div>
      )}
    </div>
  );
}
