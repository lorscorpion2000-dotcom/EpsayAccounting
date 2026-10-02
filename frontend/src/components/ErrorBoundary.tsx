import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🔴 React Error Boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleCopy = () => {
    const err = this.state.error;
    const info = this.state.errorInfo;
    const text = 'Error: ' + (err?.message || 'Unknown') +
      '\n\nStack:\n' + (err?.stack || 'No stack') +
      '\n\nComponent Stack:\n' + (info?.componentStack || 'No component stack');

    navigator.clipboard.writeText(text).then(() => {
      alert('✅ متن خطا کپی شد. لطفاً برای پشتیبانی بفرستید.');
    }).catch(() => {
      alert('❌ کپی خودکار ممکن نشد. لطفاً از Console مرورگر کپی کنید.');
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border-2 border-red-200 overflow-hidden">
            <div className="p-6 bg-red-50 border-b border-red-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-red-800">خطایی رخ داد</h2>
                  <p className="text-sm text-red-700 mt-0.5">
                    این بخش نتوانست بارگذاری شود
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <div className="text-sm font-medium text-slate-700 mb-2">پیام خطا:</div>
                <div className="bg-slate-50 rounded-lg p-3 text-sm text-red-700 font-mono overflow-x-auto" dir="ltr">
                  {this.state.error?.message || 'خطای ناشناخته'}
                </div>
              </div>

              {this.state.error?.stack && (
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-slate-700 hover:text-brand-600">
                    جزئیات فنی (برای پشتیبانی)
                  </summary>
                  <pre className="mt-2 bg-slate-900 text-slate-100 rounded-lg p-3 text-xs overflow-x-auto max-h-60" dir="ltr">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={this.handleReload}
                  className="btn-primary"
                >
                  <RefreshCw className="w-4 h-4" />
                  بارگذاری مجدد صفحه
                </button>
                <button
                  onClick={this.handleCopy}
                  className="btn-secondary"
                >
                  کپی متن خطا
                </button>
              </div>

              <div className="text-xs text-slate-500 pt-2">
                💡 برای گزارش به پشتیبانی، دکمه «کپی متن خطا» را بزنید و متن را ارسال کنید.
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
