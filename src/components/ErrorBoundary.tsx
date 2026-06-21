import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  name?: string;
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

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`ErrorBoundary [${this.props.name || 'default'}]:`, error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="font-display font-bold text-xl text-slate-900 text-center mb-2">
              页面出错了
            </h2>
            <p className="text-sm text-slate-500 text-center mb-5">
              {this.props.name ? `${this.props.name}模块` : '当前页面'}遇到了一些问题，请尝试刷新或返回首页
            </p>
            {this.state.error && (
              <div className="bg-slate-50 rounded-xl p-4 mb-5 border border-slate-100">
                <div className="text-xs font-semibold text-slate-500 mb-1.5">错误信息</div>
                <pre className="text-xs text-rose-600 font-mono whitespace-pre-wrap break-all">
                  {this.state.error.message}
                </pre>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={this.handleGoHome}
                className="flex-1 btn-secondary"
              >
                <Home className="w-4 h-4" />
                返回首页
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 btn-primary"
              >
                <RefreshCcw className="w-4 h-4" />
                重试
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
