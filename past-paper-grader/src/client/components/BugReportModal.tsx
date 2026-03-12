import { useState } from "react";
import { useHaptics } from "../hooks/useHaptics";

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BugReportModal({ isOpen, onClose }: BugReportModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const haptics = useHaptics();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await fetch("/api/bugs/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          email: user.email,
          userId: user.id,
        }),
      });

      if (res.ok) {
        haptics.success();
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setTitle("");
          setDescription("");
        }, 2000);
      }
    } catch (err) {
      haptics.error();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-base-200 border border-primary/30 rounded-lg w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 btn btn-ghost btn-xs font-mono opacity-50 hover:opacity-100"
        >
          ✕
        </button>

        {success ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">✓</div>
            <p className="text-success font-mono">Report submitted!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-bold font-mono text-primary">
              Report a Bug
            </h3>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text font-mono text-xs">Title</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of the issue"
                className="input input-bordered bg-base-300 border-primary/20 focus:border-primary font-mono text-sm"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-mono text-xs">Description</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us what happened, what you expected, and any steps to reproduce..."
                className="textarea textarea-bordered bg-base-300 border-primary/20 focus:border-primary font-mono text-sm h-32"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !title || !description}
              className="btn btn-primary w-full font-mono"
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "SUBMIT REPORT"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
