import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-gray-50 my-6 rounded-2xl border border-gray-200 mx-auto max-w-4xl">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-3 text-2xl font-bold">
            ✓
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">Content Loading</h3>
          <p className="text-sm text-gray-500 max-w-md mb-4">
            A temporary component error occurred while rendering this section. Please refresh the page to reload.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (typeof window !== "undefined") {
                window.location.reload();
              }
            }}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-full transition-colors text-xs shadow-sm"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
