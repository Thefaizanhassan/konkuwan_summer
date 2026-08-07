// vite.config.js has always pointed `setupFiles` here, but the file did not
// exist, so `vitest` failed before running anything. This is the minimum needed
// for the runner to start; no tests are claimed to exist yet.
import '@testing-library/jest-dom/vitest';
 
// jsdom implements neither of these, and both are used by the admin screens —
// Recharts' ResponsiveContainer measures with ResizeObserver, and Tailwind
// breakpoints are read through matchMedia.
globalThis.ResizeObserver = globalThis.ResizeObserver || class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
 
if (!globalThis.matchMedia) {
  globalThis.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false; },
  });
}