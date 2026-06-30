import React from 'react';
import { logClientError } from '@/api/errors/logClientError';
import ErrorFallback from '@/components/errors/ErrorFallback';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    logClientError({
      message: error?.message ?? 'Render error',
      stack: error?.stack,
      context: {
        componentStack: info?.componentStack,
        boundary: 'ErrorBoundary',
        path: this.props.path,
      },
    });
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      const { title, message, compact } = this.props;
      return (
        <ErrorFallback
          title={title}
          message={message ?? "We've logged this issue. Try again or head back to the dashboard."}
          onRetry={this.reset}
          retryLabel="Try again"
          compact={compact}
        />
      );
    }

    return this.props.children;
  }
}
