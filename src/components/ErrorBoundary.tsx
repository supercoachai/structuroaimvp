'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { captureClientException } from '@/lib/posthog/captureExceptionClient';
import { getErrorUiCopy } from '@/lib/i18n/clientLocale';
import { normalizeError } from '@/lib/normalizeError';

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

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error: normalizeError(error) };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    const err = normalizeError(error);
    console.error('Structuro Error:', err, errorInfo);
    captureClientException(err, {
      route: 'react-error-boundary',
      componentStack: errorInfo.componentStack ?? undefined,
    });
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const err = this.state.error;
      const copy = getErrorUiCopy();
      const detailText = [err.message, 'stack' in err && typeof (err as Error).stack === 'string' ? (err as Error).stack : '']
        .filter(Boolean)
        .join('\n\n');

      return (
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc',
            padding: 24,
            fontFamily: 'var(--st-font)',
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
              {copy.title}
            </h1>
            <p style={{ fontSize: '0.95rem', color: '#475569', margin: '0 0 16px', lineHeight: 1.5 }}>
              {copy.body}
            </p>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 16px', lineHeight: 1.45 }}>
              {copy.translatorNote}
            </p>
            <details style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 16 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 500 }}>{copy.detailsLabel}</summary>
              <pre
                style={{
                  marginTop: 8,
                  padding: 12,
                  backgroundColor: '#f1f5f9',
                  borderRadius: 8,
                  overflow: 'auto',
                  fontSize: 11,
                  color: '#334155',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {detailText}
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
              {copy.refreshLabel}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
