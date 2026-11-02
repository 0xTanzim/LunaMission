import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WorkspaceErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Workspace error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-2xl mx-auto my-12 rounded-lg bg-[var(--lm-color-danger-surface)] border border-[var(--lm-color-danger-border)] text-[var(--lm-color-text-primary)] font-mono text-xs">
          <div className="flex items-center gap-2 text-[var(--lm-color-danger)] font-bold text-sm mb-2">
            <span>⚠</span>
            <span>WORKSPACE EXECUTION ERROR</span>
          </div>
          <p className="text-[var(--lm-color-text-secondary)] mb-4 leading-relaxed">
            {this.state.error?.message || 'An unexpected rendering error occurred inside the workspace projection.'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-3 py-1.5 rounded bg-[var(--lm-color-surface)] border border-[var(--lm-color-border)] text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:border-[var(--lm-color-border-strong)] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[var(--lm-color-info)]"
          >
            Retry Projection
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
