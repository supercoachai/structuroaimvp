'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Structuro Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            <h1 className="text-xl font-bold text-slate-900 mb-2">Er ging iets mis</h1>
            <p className="text-slate-600 mb-4">
              De app kon niet laden. Probeer de pagina te vernieuwen (F5 of Cmd+R).
            </p>
            <details className="text-sm text-slate-500 mb-4">
              <summary className="cursor-pointer hover:text-slate-700">Technische details</summary>
              <pre className="mt-2 p-3 bg-slate-100 rounded-lg overflow-auto text-xs">
                {this.state.error.message}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Pagina vernieuwen
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
