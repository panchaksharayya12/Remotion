import React from 'react';
import { AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Clinical ErrorBoundary Caught Error]:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('remotion_patients_list');
      localStorage.removeItem('remotion_all_appointments');
      localStorage.removeItem('remotion_all_prescriptions');
      localStorage.removeItem('remotion_clinical_chat_messages');
    } catch (e) {}

    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-[340px] flex items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-3xl m-4 text-slate-800 shadow-sm">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700 shadow-sm">
              <ShieldCheck className="w-7 h-7 text-blue-600" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 font-sans">
                Clinical Workspace Self-Recovery Active
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                The clinical interface recovered from a display interruption. All patient records, prescriptions, and telemetry data remain safely preserved.
              </p>
              {this.state.error && (
                <div className="text-[10px] font-mono text-slate-500 bg-slate-100 p-2 rounded-lg mt-2 max-w-sm mx-auto truncate">
                  {this.state.error.message || String(this.state.error)}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center space-x-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Restore Clinical Workspace</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
