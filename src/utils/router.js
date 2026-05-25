/**
 * Hash-based SPA Router
 * UV Sheet — Business Management Application
 *
 * Provides client-side routing using `window.location.hash`.
 * Supports route guards (auth check), page transitions (fade), and
 * an event-driven callback system.
 *
 * Usage:
 *   import { Router } from '@/utils/router.js';
 *
 *   Router.register({
 *     '#/dashboard': dashboardPage,
 *     '#/purchases': purchasesPage,
 *     ...
 *   });
 *
 *   Router.init();                    // start listening
 *   Router.navigate('#/dashboard');   // programmatic navigation
 */

import { auth } from '../config/firebase.js';

// ── Constants ───────────────────────────────────────────────────────────
const LOGIN_ROUTE   = '#/login';
const DEFAULT_ROUTE = '#/dashboard';

/** Routes that do NOT require authentication */
const PUBLIC_ROUTES = new Set([LOGIN_ROUTE]);

/** Duration of the fade transition in ms — keep in sync with CSS */
const TRANSITION_MS = 200;

// ── Internal State ──────────────────────────────────────────────────────
/** @type {Record<string, Function>} hash → render function */
let _routes = {};

/** @type {Function[]} */
let _changeListeners = [];

/** @type {string|null} */
let _currentRoute = null;

/** @type {HTMLElement|null} */
let _outlet = null;

// ── Router API ──────────────────────────────────────────────────────────

const Router = {
  /**
   * Register route definitions.
   * @param {Record<string, Function>} routeMap — e.g. { '#/dashboard': renderDashboard }
   */
  register(routeMap) {
    _routes = { ..._routes, ...routeMap };
  },

  /**
   * Set the DOM element that will serve as the page outlet (container).
   * If not called, defaults to `document.getElementById('app')`.
   * @param {HTMLElement} el
   */
  setOutlet(el) {
    _outlet = el;
  },

  /**
   * Initialise the router — start listening to hash changes and render the
   * initial route.
   */
  init() {
    window.addEventListener('hashchange', () => _handleRouteChange());
    // Render initial route on load
    _handleRouteChange();
  },

  /**
   * Programmatically navigate to a route.
   * @param {string} path — hash path, e.g. '#/purchases'
   */
  navigate(path) {
    if (window.location.hash === path) {
      // Force re-render even if hash hasn't changed
      _handleRouteChange();
    } else {
      window.location.hash = path;
    }
  },

  /**
   * Get the current hash route.
   * @returns {string}
   */
  getCurrentRoute() {
    return window.location.hash || DEFAULT_ROUTE;
  },

  /**
   * Register a callback that fires whenever the route changes.
   * @param {Function} callback — receives (newRoute, oldRoute)
   * @returns {Function} unsubscribe function
   */
  onRouteChange(callback) {
    _changeListeners.push(callback);
    return () => {
      _changeListeners = _changeListeners.filter((cb) => cb !== callback);
    };
  },

  /**
   * Remove all registered routes and listeners (useful for testing / cleanup).
   */
  destroy() {
    _routes = {};
    _changeListeners = [];
    _currentRoute = null;
  },
};

// ── Internal Helpers ────────────────────────────────────────────────────

/**
 * Main handler — called on every hash change and on init.
 * Enforces the auth guard then performs a page transition.
 * @private
 */
async function _handleRouteChange() {
  const hash = window.location.hash || DEFAULT_ROUTE;

  // ── Auth Guard ──────────────────────────────────────
  const user = auth.currentUser;
  if (!user && !PUBLIC_ROUTES.has(hash)) {
    // Not authenticated → redirect to login
    window.location.hash = LOGIN_ROUTE;
    return;
  }
  // If already logged in and trying to visit login page → go to dashboard
  if (user && hash === LOGIN_ROUTE) {
    window.location.hash = DEFAULT_ROUTE;
    return;
  }

  const renderFn = _routes[hash];
  if (!renderFn) {
    console.warn(`[Router] No route handler for "${hash}" — redirecting to default.`);
    window.location.hash = DEFAULT_ROUTE;
    return;
  }

  const oldRoute = _currentRoute;
  _currentRoute = hash;

  // Notify listeners
  _changeListeners.forEach((cb) => {
    try { cb(hash, oldRoute); } catch (e) { console.error('[Router] Listener error:', e); }
  });

  // Perform page transition
  await _transitionTo(renderFn);
}

/**
 * Fade-out the current page, call the render function, then fade-in.
 * @private
 * @param {Function} renderFn — function that renders DOM into the outlet
 */
async function _transitionTo(renderFn) {
  const outlet = _outlet || document.getElementById('app');
  if (!outlet) {
    console.error('[Router] No outlet element found (#app).');
    return;
  }

  // Fade out
  outlet.style.transition = `opacity ${TRANSITION_MS}ms ease`;
  outlet.style.opacity = '0';

  await _wait(TRANSITION_MS);

  // Clear and render new page
  try {
    outlet.innerHTML = '';
    await renderFn(outlet);
  } catch (err) {
    console.error('[Router] Render error:', err);
    outlet.innerHTML = `<div class="error-page"><h2>Something went wrong</h2><p>${err.message}</p></div>`;
  }

  // Fade in
  outlet.style.opacity = '1';
}

/**
 * Promisified setTimeout.
 * @private
 * @param {number} ms
 * @returns {Promise<void>}
 */
function _wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Export ───────────────────────────────────────────────────────────────
export { Router };
