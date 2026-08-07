import { Component } from 'react';
 
// Without this, one thrown render error unmounts the whole React tree and the
// user is left looking at a white page with nothing to report and no way back.
// A boundary turns that into a message, the error id if the API supplied one,
// and a route back to the dashboard.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
 
  static getDerivedStateFromError(error) {
    return { error };
  }
 
  componentDidCatch(error, info) {
    // Workers Logs and the browser console both capture this. There is no error
    // reporting service wired up yet — see Memory.md §7.
    console.error('Unhandled render error:', error, info?.componentStack);
  }
 
  render() {
    if (!this.state.error) return this.props.children;
 
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F4EFE6' }}>
        <div className="max-w-md text-center">
          <p className="text-4xl mb-3" aria-hidden="true">🌿</p>
          <h1 className="font-display text-2xl mb-2" style={{ color: '#162F22' }}>
            Something went wrong
          </h1>
          <p className="text-sm mb-6" style={{ color: '#6B7B6E' }}>
            This screen failed to load. Reloading usually clears it — if it does not,
            send this message to your administrator.
          </p>
          {/* The message, not the stack: a stack trace on screen tells the user
              nothing and tells anyone looking over their shoulder too much. */}
          <p className="text-xs font-mono mb-6 px-3 py-2 rounded-lg break-words"
             style={{ background: '#EAE3D6', color: '#7A1C16' }}>
            {String(this.state.error?.message || this.state.error)}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#162F22', color: '#fff' }}
            >
              Reload
            </button>
            <a
              href="/admin"
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border"
              style={{ borderColor: '#D8D0C4', color: '#2B5240' }}
            >
              Back to dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}