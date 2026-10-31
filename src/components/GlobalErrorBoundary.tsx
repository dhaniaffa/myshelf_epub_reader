import React, { Component } from 'react';
import { AlertTriangle, Check, Copy, Home, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/Button';

export interface GlobalErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface GlobalErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  copied: boolean;
}

export class GlobalErrorBoundary extends Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  constructor(props: GlobalErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<GlobalErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('Unhandled React Render Error in GlobalErrorBoundary:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleBackToHome = (): void => {
    try {
      window.location.hash = '';
    } catch {
      // ignore
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleCopyDetails = async (): Promise<void> => {
    const { error, errorInfo } = this.state;
    const details = [
      `[MyShelf Crash Report]`,
      `Time: ${new Date().toISOString()}`,
      `URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}`,
      `User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}`,
      `Error: ${error?.name || 'Error'}: ${error?.message || 'Unknown error'}`,
      `Stack:\n${error?.stack || 'No stack trace available'}`,
      `Component Stack:\n${errorInfo?.componentStack || 'No component stack available'}`,
    ].join('\n\n');

    try {
      await navigator.clipboard.writeText(details);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    } catch (err) {
      console.warn('Failed to copy error report to clipboard:', err);
    }
  };

  render(): React.ReactNode {
    const { hasError, error, errorInfo, copied } = this.state;
    const { children, fallback } = this.props;

    if (!hasError) {
      return children;
    }

    if (fallback) {
      return fallback;
    }

    return (
      <div className="bg-surface text-on-surface flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-6">
        <div className="bg-surface-container border-outline-variant/30 flex w-full max-w-lg flex-col items-center rounded-[28px] border p-6 text-center shadow-2xl sm:p-8">
          {/* Warning Icon Badge */}
          <div className="bg-error-container text-on-error-container mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm">
            <AlertTriangle size={32} />
          </div>

          <h2 className="text-on-surface text-xl font-bold tracking-tight sm:text-2xl">
            Terjadi Kesalahan Tak Terduga
          </h2>

          <p className="text-on-surface-variant mt-2 text-xs leading-relaxed sm:text-sm">
            Aplikasi mengalami kendala saat memproses tampilan ini. Anda dapat memuat ulang halaman
            atau kembali ke halaman Rak Buku.
          </p>

          {/* Action Buttons */}
          <div className="mt-6 flex w-full flex-wrap items-center justify-center gap-3">
            <Button
              variant="filled"
              size="md"
              icon={<RefreshCw size={16} />}
              onClick={this.handleReload}
            >
              Muat Ulang Aplikasi
            </Button>

            <Button
              variant="outlined"
              size="md"
              icon={<Home size={16} />}
              onClick={this.handleBackToHome}
            >
              Kembali ke Rak Buku
            </Button>

            <Button
              variant="tonal"
              size="md"
              icon={copied ? <Check size={16} /> : <Copy size={16} />}
              onClick={this.handleCopyDetails}
            >
              {copied ? 'Rincian Tersalin!' : 'Salin Rincian Error'}
            </Button>
          </div>

          {/* Technical Details Accordion */}
          {error && (
            <details className="border-outline-variant/20 bg-surface-container-highest/50 mt-6 w-full overflow-hidden rounded-2xl border text-left">
              <summary className="text-on-surface-variant hover:text-on-surface cursor-pointer p-3.5 text-xs font-semibold select-none">
                Lihat Informasi Teknis (Untuk Debugging)
              </summary>
              <div className="border-outline-variant/20 border-t p-3.5 pt-2">
                <p className="text-error font-mono text-xs font-semibold">{error.message}</p>
                {error.stack && (
                  <pre className="text-on-surface-variant mt-2 max-h-40 overflow-x-auto overflow-y-auto font-mono text-[11px] leading-tight">
                    {error.stack}
                  </pre>
                )}
                {errorInfo?.componentStack && (
                  <pre className="text-outline mt-2 max-h-32 overflow-x-auto overflow-y-auto font-mono text-[10px] leading-tight">
                    {errorInfo.componentStack}
                  </pre>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }
}
