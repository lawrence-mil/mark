import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendVerificationCode, verifyCode } from "../lib/api";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "verify">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await sendVerificationCode(email);
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await verifyCode(email, code);
      localStorage.setItem("user", JSON.stringify(result.user));
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-8 font-mono">
      <div className="text-center space-y-2">
        <p className="text-primary text-sm">&gt; AUTHENTICATE</p>
        <p className="text-xs opacity-50">
          {step === "email" ? "Enter your email to sign in" : "Enter the verification code"}
        </p>
      </div>

      <form onSubmit={step === "email" ? handleSendCode : handleVerify} className="space-y-4">
        {step === "email" ? (
          <div className="form-control">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="input input-bordered bg-base-200 border-primary/30 focus:border-primary font-mono text-sm"
              required
            />
          </div>
        ) : (
          <div className="form-control">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="input input-bordered bg-base-200 border-primary/30 focus:border-primary font-mono text-sm text-center tracking-widest"
              maxLength={6}
              required
            />
          </div>
        )}

        {error && (
          <div className="text-xs text-error font-mono">
            &gt; ERROR: {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full font-mono text-sm"
        >
          {loading ? (
            <span className="loading loading-spinner loading-sm" />
          ) : step === "email" ? (
            "SEND CODE"
          ) : (
            "VERIFY"
          )}
        </button>
      </form>

      {step === "verify" && (
        <button
          onClick={() => { setStep("email"); setCode(""); }}
          className="btn btn-ghost btn-sm font-mono text-xs opacity-50"
        >
          &lt; BACK
        </button>
      )}
    </div>
  );
}
