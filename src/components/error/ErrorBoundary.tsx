import { Component, type ReactNode } from 'react';
import { ErrorFallback } from './ErrorFallback';
import { logger } from '@/lib/logger';

interface FallbackRenderProps {
  error: Error;
  resetErrorBoundary: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  fallbackRender?: (props: FallbackRenderProps) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  context?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorLogger = logger.child('ErrorBoundary');

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { onError, context } = this.props;

    this.errorLogger.error('Component error caught', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context,
    });

    if (onError) {
      onError(error, errorInfo);
    }
  }

  resetErrorBoundary = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, fallbackRender, context } = this.props;

    if (hasError && error) {
      // Priority: fallbackRender > fallback > default ErrorFallback
      if (fallbackRender) {
        return fallbackRender({
          error,
          resetErrorBoundary: this.resetErrorBoundary,
        });
      }

      if (fallback) {
        return fallback;
      }

      return (
        <ErrorFallback
          error={error}
          resetErrorBoundary={this.resetErrorBoundary}
          context={context}
        />
      );
    }

    return children;
  }
}
