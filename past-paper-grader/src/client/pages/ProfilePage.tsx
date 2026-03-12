import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getUser, type User } from "../lib/api";

export function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center space-y-4 py-12">
        <p className="text-sm opacity-60 font-mono">&gt; Not signed in</p>
        <Link to="/login" className="btn btn-primary btn-sm font-mono">
          SIGN IN
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="font-mono space-y-1">
          <p className="text-xs opacity-40">&gt; Signed in as</p>
          <p className="text-primary font-bold">{user.email}</p>
        </div>
        <button onClick={handleLogout} className="btn btn-ghost btn-sm font-mono text-xs opacity-60">
          SIGN OUT
        </button>
      </div>

      <div className="card bg-base-200 border border-primary/20">
        <div className="card-body">
          <p className="text-xs opacity-40 font-mono uppercase tracking-wider mb-4">
            &gt; Your Submissions
          </p>
          <p className="text-xs opacity-50 font-mono">
            &gt; No submissions yet. Upload a paper to get started.
          </p>
        </div>
      </div>
    </div>
  );
}
