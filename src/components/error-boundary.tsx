"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { isChunkLoadError } from "@/lib/chunk-load-error";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private chunkErrorResetTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isChunkLoadError(error)) {
      console.warn(`[ErrorBoundary: ${this.props.name || "unnamed"}] transient chunk load failed`, error);
      this.chunkErrorResetTimer = setTimeout(() => {
        this.setState({ hasError: false, error: null });
      }, 1000);
      return;
    }

    console.error(`[ErrorBoundary: ${this.props.name || "unnamed"}]`, error, errorInfo);
  }

  componentWillUnmount() {
    if (this.chunkErrorResetTimer) {
      clearTimeout(this.chunkErrorResetTimer);
    }
  }

  render() {
    if (this.state.hasError) {
      if (isChunkLoadError(this.state.error)) {
        return null;
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-6 text-center text-red-500">
          <p className="font-bold">Something went wrong</p>
          <p className="text-sm text-muted-foreground mt-2">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
