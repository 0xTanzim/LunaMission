import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Map } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onFallbackTo2D?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class VisualizationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Visualization error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[460px] flex flex-col items-center justify-center p-6 bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border)] rounded-[var(--lm-radius-lg)] text-center">
          <div className="w-10 h-10 rounded-full bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-warning)]/40 flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5 text-[var(--lm-color-warning)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--lm-color-text-primary)]">
            {this.props.fallbackTitle || 'Visualization Renderer Encountered an Error'}
          </h3>
          <p className="text-xs text-[var(--lm-color-text-secondary)] max-w-md mt-1.5 mb-4 leading-relaxed font-mono">
            {this.state.error?.message || 'The graphics pipeline or WebGL context experienced an unexpected interruption.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-surface-raised)] border border-[var(--lm-color-border)] text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-strong)] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Rendering</span>
            </button>
            {this.props.onFallbackTo2D && (
              <button
                type="button"
                onClick={() => {
                  this.handleReset();
                  this.props.onFallbackTo2D?.();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-surface-strong)] border border-[var(--lm-color-selected-site)]/60 text-[var(--lm-color-selected-site)] hover:bg-[var(--lm-color-border)] transition-colors"
              >
                <Map className="w-3.5 h-3.5" />
                <span>Switch to 2D Polar Map</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
