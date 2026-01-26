import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { ErrorFallback } from './ErrorFallback';

// Component that throws an error
const ThrowingComponent = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Normal content</div>;
};

describe('ErrorBoundary', () => {
  // Suppress console.error for expected errors in tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  describe('when no error occurs', () => {
    it('renders children normally', () => {
      render(
        <ErrorBoundary>
          <div>Hello World</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });
  });

  describe('when an error occurs', () => {
    it('catches errors and renders fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('displays the error message', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/test error/i)).toBeInTheDocument();
    });

    it('provides a retry button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('resets error state on retry', () => {
      let shouldThrow = true;
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div>Recovered</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Fix the error condition
      shouldThrow = false;

      // Click retry
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      // Re-render after retry
      rerender(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Recovered')).toBeInTheDocument();
    });
  });

  describe('with custom fallback', () => {
    it('renders custom fallback component', () => {
      const CustomFallback = () => <div>Custom error UI</div>;

      render(
        <ErrorBoundary fallback={<CustomFallback />}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    });

    it('passes error to fallback render prop', () => {
      render(
        <ErrorBoundary
          fallbackRender={({ error }) => <div>Error: {error.message}</div>}
        >
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error: Test error')).toBeInTheDocument();
    });
  });

  describe('onError callback', () => {
    it('calls onError when an error occurs', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Test error' }),
        expect.any(Object)
      );
    });
  });

  describe('with context name', () => {
    it('includes context in error display', () => {
      render(
        <ErrorBoundary context="Dashboard">
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });
  });
});

describe('ErrorFallback', () => {
  it('renders error message', () => {
    const error = new Error('Test fallback error');
    render(<ErrorFallback error={error} resetErrorBoundary={() => {}} />);

    expect(screen.getByText(/test fallback error/i)).toBeInTheDocument();
  });

  it('calls resetErrorBoundary on retry click', () => {
    const resetFn = vi.fn();
    render(<ErrorFallback error={new Error('Error')} resetErrorBoundary={resetFn} />);

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(resetFn).toHaveBeenCalled();
  });

  it('renders with CRT styling', () => {
    render(<ErrorFallback error={new Error('Error')} resetErrorBoundary={() => {}} />);

    const container = screen.getByTestId('error-fallback');
    expect(container).toHaveClass('crt-status-fail');
  });
});
