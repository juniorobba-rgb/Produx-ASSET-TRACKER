import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl max-w-lg w-full text-white shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-red-400">Something went wrong</h2>
            <div className="bg-black/30 p-4 rounded-lg overflow-auto max-h-64 text-sm font-mono text-slate-300">
              {this.state.error?.message}
            </div>
            <button
              className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
              onClick={() => window.location.reload()}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
