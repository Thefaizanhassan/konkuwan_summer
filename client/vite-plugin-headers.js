/**
 * Emits a Cloudflare `_headers` file into the build output.
 *
 * Why this exists: helmet() is Express middleware, and the Worker only routes
 * `/api/*` through Express (`run_worker_first` in wrangler.jsonc). The SPA is
 * served by Workers Static Assets, which never touches Express — so before this
 * plugin the HTML document that actually executes JavaScript carried no CSP, no
 * X-Frame-Options and no Referrer-Policy. Headers on JSON API responses do not
 * protect the page.
 *
 * The Supabase origin is baked in at build time rather than wildcarded to
 * `*.supabase.co`: with a wildcard, script running on this origin could
 * exfiltrate the session token to an attacker's own Supabase project, which is
 * most of what the CSP is meant to prevent.
 */
function originOf(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
 
export default function cloudflareHeaders() {
  let supabaseOrigin = null;
 
  return {
    name: 'konkuwan-cloudflare-headers',
    apply: 'build',
 
    configResolved(config) {
      supabaseOrigin = originOf(config.env.VITE_SUPABASE_URL);
      if (!supabaseOrigin) {
        // Failing the build is the right call: a deployed SPA whose CSP omits
        // the Supabase origin cannot log anyone in, and that is far harder to
        // diagnose from the browser than a build error is here.
        throw new Error(
          'VITE_SUPABASE_URL is missing or not a URL, so the Content-Security-Policy ' +
          'cannot be generated. Set it as a Workers Builds "Build variable" ' +
          '(not a Worker secret — the SPA needs it at build time).'
        );
      }
    },
 
    generateBundle() {
      const csp = [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        // No inline scripts are emitted — Vite links a module bundle — so this
        // stays strict. That is the directive that matters for XSS.
        "script-src 'self'",
        "script-src-attr 'none'",
        // React inline `style={{…}}` becomes a style attribute, and Recharts
        // sets styles inline, so 'unsafe-inline' is unavoidable here. It does
        // not enable script execution.
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        'font-src \'self\' data: https://fonts.gstatic.com',
        // Product images are served from Supabase Storage.
        `img-src 'self' data: blob: ${supabaseOrigin}`,
        // The SPA calls Supabase Auth directly, and the API on its own origin.
        `connect-src 'self' ${supabaseOrigin}`,
        'upgrade-insecure-requests',
      ].join('; ');
 
      const body = [
        '/*',
        `  Content-Security-Policy: ${csp}`,
        '  X-Content-Type-Options: nosniff',
        '  Referrer-Policy: strict-origin-when-cross-origin',
        '  X-Frame-Options: DENY',
        '  Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=()',
        '  Cross-Origin-Opener-Policy: same-origin',
        // Cloudflare terminates TLS; this tells browsers never to try http.
        '  Strict-Transport-Security: max-age=31536000; includeSubDomains',
        '',
        // Hashed asset filenames are immutable, so they can be cached hard.
        '/assets/*',
        '  Cache-Control: public, max-age=31536000, immutable',
        '',
      ].join('\n');
 
      this.emitFile({ type: 'asset', fileName: '_headers', source: body });
    },
  };
}