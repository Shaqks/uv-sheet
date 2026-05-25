/**
 * UV Sheet — Main Application Entry Point
 * Bootstraps the app: auth guard, routing, and page rendering
 * @module main
 */

// Styles
import './styles/index.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/dashboard.css';
import './styles/auth.css';

// Services
import { onAuthChanged, signOutUser } from './services/auth.service.js';

// Components
import { createAppShell } from './components/app-shell.js';

// Pages
import { renderLoginPage } from './pages/login.js';
import { renderDashboardPage, cleanup as cleanupDashboard } from './pages/dashboard.js';
import { renderBuyingPage, cleanup as cleanupBuying } from './pages/buying.js';
import { renderSellingPage, cleanup as cleanupSelling } from './pages/selling.js';
import { renderInventoryPage, cleanup as cleanupInventory } from './pages/inventory.js';
import { renderMastersPage, cleanup as cleanupMasters } from './pages/masters.js';

/** @type {HTMLElement} */
const appEl = document.getElementById('app');

/** @type {Object|null} App shell instance */
let shell = null;

/** @type {string} Current active route */
let currentRoute = '';

/** @type {Function|null} Current page cleanup function */
let currentCleanup = null;

/**
 * Route configuration
 * Maps hash routes to page renderers and metadata
 */
const ROUTES = {
  '#/dashboard': {
    id: 'dashboard',
    title: 'Dashboard',
    render: renderDashboardPage,
    cleanup: cleanupDashboard,
  },
  '#/buying': {
    id: 'buying',
    title: 'Purchases',
    render: renderBuyingPage,
    cleanup: cleanupBuying,
  },
  '#/selling': {
    id: 'selling',
    title: 'Sales',
    render: renderSellingPage,
    cleanup: cleanupSelling,
  },
  '#/inventory': {
    id: 'inventory',
    title: 'Inventory',
    render: renderInventoryPage,
    cleanup: cleanupInventory,
  },
  '#/masters': {
    id: 'masters',
    title: 'Master Data',
    render: renderMastersPage,
    cleanup: cleanupMasters,
  },
};

const DEFAULT_ROUTE = '#/dashboard';

/**
 * Initialize the application
 */
function init() {
  // Listen for auth state changes
  onAuthChanged((user) => {
    if (user) {
      // User is signed in — show the app
      renderApp(user);
    } else {
      // No user — show login
      renderLogin();
    }
  });
}

/**
 * Render the login page
 */
function renderLogin() {
  // Clean up any existing page
  cleanupCurrentPage();
  shell = null;
  currentRoute = '';

  appEl.innerHTML = '';
  appEl.className = '';

  renderLoginPage(appEl, (user) => {
    // Login success — renderApp will be called by onAuthChanged
  });
}

/**
 * Render the main application with app shell
 */
function renderApp(user) {
  appEl.innerHTML = '';
  appEl.className = 'app-root';

  // Create app shell (sidebar + topbar + content area)
  shell = createAppShell(appEl, {
    onNavigate: (path) => {
      navigate(path);
    },
    onLogout: async () => {
      try {
        cleanupCurrentPage();
        await signOutUser();
        // onAuthChanged will trigger renderLogin
      } catch (err) {
        console.error('Logout error:', err);
      }
    },
    currentUser: user,
  });

  // Listen for hash changes
  window.addEventListener('hashchange', handleRouteChange);

  // Navigate to current hash or default
  const hash = window.location.hash || DEFAULT_ROUTE;
  navigate(hash);
}

/**
 * Navigate to a route
 * @param {string} path - Hash path (e.g., '#/dashboard')
 */
function navigate(path) {
  if (!path || !ROUTES[path]) {
    path = DEFAULT_ROUTE;
  }

  if (path === currentRoute) return;

  window.location.hash = path;
}

/**
 * Handle hash change events
 */
function handleRouteChange() {
  const hash = window.location.hash || DEFAULT_ROUTE;
  const route = ROUTES[hash];

  if (!route) {
    window.location.hash = DEFAULT_ROUTE;
    return;
  }

  if (hash === currentRoute) return;

  // Clean up previous page
  cleanupCurrentPage();

  currentRoute = hash;

  // Update shell
  if (shell) {
    shell.setActivePage(route.id);
    shell.setPageTitle(route.title);

    // Get content area and render page with transition
    const content = shell.getContentArea();
    if (content) {
      // Fade out
      content.style.opacity = '0';
      content.style.transform = 'translateY(8px)';

      setTimeout(() => {
        // Clear and render new page
        content.innerHTML = '';
        route.render(content);
        currentCleanup = route.cleanup;

        // Fade in
        requestAnimationFrame(() => {
          content.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
          content.style.opacity = '1';
          content.style.transform = 'translateY(0)';
        });
      }, 150);
    }
  }
}

/**
 * Clean up the current page before navigating away
 */
function cleanupCurrentPage() {
  if (currentCleanup) {
    try {
      currentCleanup();
    } catch (err) {
      console.error('Page cleanup error:', err);
    }
    currentCleanup = null;
  }
}

// Boot the application
init();

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Log app version
console.log(
  '%c UV Sheet v1.0.0 %c Business Management System ',
  'background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 4px 8px; border-radius: 4px 0 0 4px; font-weight: bold;',
  'background: #111827; color: #94a3b8; padding: 4px 8px; border-radius: 0 4px 4px 0;'
);
