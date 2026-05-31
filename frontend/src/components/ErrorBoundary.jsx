import { Component } from "react";

/* Minimal error boundary for PR1. PR6 will replace the fallback markup
   with a designed <EmptyState variant="error">. */
class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "grid",
          placeItems: "center",
          padding: "var(--space-6, 24px)",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            textAlign: "center",
            padding: "var(--space-7, 32px)",
            borderRadius: "var(--radius-lg, 16px)",
            background: "var(--bg-surface, #131826)",
            border: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
            boxShadow: "var(--elev-2)",
            color: "var(--fg-primary, #f1f5f9)",
            fontFamily: "var(--font-sans, system-ui)",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Something broke on the page</h2>
          <p style={{ marginTop: 12, color: "var(--fg-muted, #94a3b8)", fontSize: 14 }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={this.reset}
            style={{
              marginTop: 20,
              padding: "10px 18px",
              border: "none",
              borderRadius: "var(--radius-md, 10px)",
              background: "var(--brand-grad, linear-gradient(90deg,#ff8a00,#e52e71))",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
