'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { CalmErrorPanel } from '@/components/CalmErrorPanel';
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

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const err = this.state.error;
      const copy = getErrorUiCopy();
      const detailText = [err.message, 'stack' in err && typeof (err as Error).stack === 'string' ? (err as Error).stack : '']
        .filter(Boolean)
        .join('\n\n');

      return (
        <CalmErrorPanel
          fullScreen
          title={copy.title}
          body={copy.body}
          note={copy.translatorNote}
          detailsLabel={copy.detailsLabel}
          detailText={detailText}
          retryLabel={copy.retryLabel}
          refreshLabel={copy.refreshLabel}
          onRetry={this.handleRetry}
        />
      );
    }
    return this.props.children;
  }
}
