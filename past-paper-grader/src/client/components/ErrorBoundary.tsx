import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-base-300 text-base-content flex items-center justify-center p-8">
          <div className="card bg-base-200 border border-error/30 max-w-lg w-full">
            <div className="card-body font-mono">
              <p className="text-error font-bold text-sm">
                &gt; FATAL ERROR
              </p>
              <p className="text-xs opacity-60 mt-2">
                {this.state.error?.message || "An unexpected error occurred."}
              </p>
              <div className="card-actions mt-4">
                <button
                  className="btn btn-sm btn-outline btn-error"
                  onClick={() => window.location.reload()}
                >
                  [ RELOAD ]
                </button>
                <a href="/" className="btn btn-sm btn-outline">
                  [ HOME ]
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
