// Hash-based SPA Router
// Matches routes like #/, #/search?q=term, #/article/:id, #/category/:name

const Router = (() => {
  const routes = [];
  let currentRoute = null;
  let beforeEachGuard = null;

  /**
   * Register a route pattern
   * @param {string} pattern - e.g. '/', '/search', '/article/:id', '/category/:name'
   * @param {Function} handler - fn({ params, query, hash })
   */
  function on(pattern, handler) {
    const keys = [];
    const regexStr = pattern
      .replace(/:(\w+)/g, (_, key) => {
        keys.push(key);
        return '([^/?#]+)';
      })
      .replace(/\*/g, '.*');

    const regex = new RegExp(`^${regexStr}$`);
    routes.push({ pattern, regex, keys, handler });
  }

  /**
   * Set a guard that runs before each route change.
   * Return false to cancel navigation.
   */
  function beforeEach(fn) {
    beforeEachGuard = fn;
  }

  /**
   * Parse the current URL hash and find matching route
   */
  function resolve() {
    const rawHash = window.location.hash.slice(1) || '/';
    const [pathPart, queryPart] = rawHash.split('?');

    // Parse query params
    const query = {};
    if (queryPart) {
      queryPart.split('&').forEach((pair) => {
        const [k, v] = pair.split('=');
        if (k) query[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }

    // Find matching route
    for (const route of routes) {
      const match = pathPart.match(route.regex);
      if (match) {
        const params = {};
        route.keys.forEach((key, i) => {
          params[key] = decodeURIComponent(match[i + 1]);
        });
        return { route, params, query, path: pathPart };
      }
    }
    return null;
  }

  /**
   * Navigate to a hash URL programmatically
   */
  function navigate(hash) {
    if (hash.startsWith('#')) hash = hash.slice(1);
    window.location.hash = hash;
  }

  /**
   * Run the current route's handler
   */
  async function run() {
    const resolved = resolve();
    if (!resolved) {
      // Default: go to home
      navigate('');
      return;
    }

    if (beforeEachGuard) {
      const ok = await beforeEachGuard(resolved);
      if (ok === false) return;
    }

    currentRoute = resolved;
    await resolved.route.handler({
      params: resolved.params,
      query: resolved.query,
      path: resolved.path,
    });
  }

  // Listen for hash changes
  window.addEventListener('hashchange', () => run());
  window.addEventListener('DOMContentLoaded', () => run());

  function getCurrentRoute() {
    return currentRoute;
  }

  return { on, navigate, run, resolve, getCurrentRoute, beforeEach };
})();
