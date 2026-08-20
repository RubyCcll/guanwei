// 错误边界：任何页面渲染崩溃时显示古风占位，避免白屏
import { Component } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface State { hasError: boolean; message: string }

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(e: unknown): State {
    return { hasError: true, message: e instanceof Error ? e.message : '未知之虞' };
  }

  componentDidCatch(e: unknown) {
    console.error('[观微] 页面异常:', e);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="wrap" style={{ paddingTop: 'var(--sp-8)', textAlign: 'center' }}>
          <div className="result-placeholder">
            <div className="glyph">滞</div>
            <p>此页一时未应机 · 请返首页再试</p>
            <p className="tiny muted" style={{ marginTop: '.4rem' }}>{this.state.message}</p>
          </div>
          <div className="mt-4">
            <Link className="btn-seal" to="/" onClick={() => this.setState({ hasError: false })}>
              <span className="sb-label">返 首 页</span>
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}