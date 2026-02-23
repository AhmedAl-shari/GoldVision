import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { tokens } from "../lib/design-tokens";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });

    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div
          className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"
          style={{ padding: tokens.spacing["4xl"] }}
        >
          <div
            className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center"
            style={{ borderRadius: tokens.radius.lg }}
          >
            <div className="mb-6">
              <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
              <h2
                className="text-xl font-semibold text-gray-900 dark:text-white mb-2"
                style={{ fontSize: tokens.typography.fontSize.xl }}
              >
                Something went wrong
              </h2>
              <p
                className="text-gray-600 dark:text-gray-400"
                style={{ fontSize: tokens.typography.fontSize.sm }}
              >
                We're sorry, but something unexpected happened. Please try
                again.
              </p>
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details
                className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded text-left"
                style={{ borderRadius: tokens.radius.md }}
              >
                <summary
                  className="cursor-pointer font-medium text-gray-700 dark:text-gray-300"
                  style={{ fontSize: tokens.typography.fontSize.sm }}
                >
                  Error Details (Development)
                </summary>
                <pre
                  className="mt-2 text-xs text-red-600 dark:text-red-400 overflow-auto"
                  style={{ fontSize: tokens.typography.fontSize.xs }}
                >
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div
              className="flex gap-3 justify-center"
              style={{ gap: tokens.spacing.sm }}
            >
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                style={{
                  borderRadius: tokens.radius.md,
                  padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
                  fontSize: tokens.typography.fontSize.sm,
                }}
              >
                <RefreshCw size={16} />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                style={{
                  borderRadius: tokens.radius.md,
                  padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
                  fontSize: tokens.typography.fontSize.sm,
                }}
              >
                <Home size={16} />
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundaries for different components
export const NewsErrorBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => (
  <ErrorBoundary
    fallback={
      <div
        className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg"
        style={{
          padding: tokens.spacing["2xl"],
          borderRadius: tokens.radius.lg,
        }}
      >
        <AlertTriangle size={32} className="text-yellow-500 mb-4" />
        <h3
          className="text-lg font-medium text-gray-900 dark:text-white mb-2"
          style={{ fontSize: tokens.typography.fontSize.lg }}
        >
          News Offline
        </h3>
        <p
          className="text-gray-600 dark:text-gray-400 text-center mb-4"
          style={{ fontSize: tokens.typography.fontSize.sm }}
        >
          We're having trouble loading news. Please check your connection and
          try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          style={{
            borderRadius: tokens.radius.md,
            padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
            fontSize: tokens.typography.fontSize.sm,
          }}
        >
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;
