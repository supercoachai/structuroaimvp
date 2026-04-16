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
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc',
            padding: 24,
            fontFamily:
              'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: 420,
              width: '100%',
              backgroundColor: '#ffffff',
              borderRadius: 12,
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              border: '1px solid #e2e8f0',
              padding: 24,
            }}
          >
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
              Er ging iets mis
            </h1>
            <p style={{ fontSize: '0.95rem', color: '#475569', margin: '0 0 16px', lineHeight: 1.5 }}>
              De app kon niet laden. Probeer de pagina te vernieuwen (F5 of Cmd+R).
            </p>
            <details style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 16 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 500 }}>Technische details</summary>
              <pre
                style={{
                  marginTop: 8,
                  padding: 12,
                  backgroundColor: '#f1f5f9',
                  borderRadius: 8,
                  overflow: 'auto',
                  fontSize: 11,
                  color: '#334155',
                }}
              >
                {this.state.error.message}
              </pre>
            </details>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
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
