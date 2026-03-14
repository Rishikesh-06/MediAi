import React from "react";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <div className="glass-card p-8 max-w-md text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">{this.state.error?.message || "An unexpected error occurred."}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => window.history.back()}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent">
                <ArrowLeft className="h-4 w-4" /> Go Back
              </button>
              <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
                <RefreshCw className="h-4 w-4" /> Retry
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
