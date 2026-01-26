import { AlertTriangle, RefreshCw } from 'lucide-react';

export interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  context?: string;
}

export function ErrorFallback({
  error,
  resetErrorBoundary,
  context,
}: ErrorFallbackProps) {
  return (
    <div
      data-testid="error-fallback"
      className="crt-status-fail p-6 rounded-lg border border-red-500/30 bg-black/50"
      role="alert"
    >
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="w-6 h-6 text-red-500" />
        <h2 className="text-lg font-mono">
          Something went wrong{context ? ` in ${context}` : ''}
        </h2>
      </div>

      <div className="mb-4 p-3 bg-black/30 rounded font-mono text-sm text-red-400 overflow-auto max-h-32">
        {error.message}
      </div>

      <button
        onClick={resetErrorBoundary}
        className="crt-button flex items-center gap-2 text-sm"
      >
        <RefreshCw className="w-4 h-4" />
        Try again
      </button>
    </div>
  );
}
