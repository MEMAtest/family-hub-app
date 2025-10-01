'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo
    });

    // Check if it's a chunk loading error
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      // Attempt to reload the page to get fresh chunks
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunkError = this.state.error?.name === 'ChunkLoadError' ||
                          this.state.error?.message.includes('Loading chunk') ||
                          this.state.error?.message.includes('failed');

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-900">
                {isChunkError ? 'Loading Error' : 'Something went wrong'}
              </h2>
            </div>

            <p className="text-gray-600 mb-6">
              {isChunkError
                ? 'The application is loading an updated version. Please refresh the page to continue.'
                : 'An unexpected error occurred. Please try refreshing the page.'
              }
            </p>

            <div className="flex gap-3">
              {!isChunkError && (
                <button
                  onClick={this.handleRetry}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Try Again
                </button>
              )}
              <button
                onClick={this.handleReload}
                className={`${!isChunkError ? 'flex-1' : 'w-full'} px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2`}
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 p-3 bg-gray-100 rounded text-xs">
                <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                  Error Details (Development)
                </summary>
                <pre className="whitespace-pre-wrap text-gray-600">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;