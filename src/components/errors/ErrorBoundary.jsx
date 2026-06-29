import React from 'react';
import { logClientError } from '@/api/errors/logClientError';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logClientError({
      message: error?.message ?? 'Render error',
      stack: error?.stack,
      context: {
        componentStack: info?.componentStack,
        boundary: 'ErrorBoundary',
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback" role="alert">
          <h1 className="error-fallback-title">Something went wrong</h1>
          <p className="error-fallback-text">
            We&apos;ve logged this issue. Try refreshing the page.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
