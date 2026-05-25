/**
 * @module app-shell
 * @description Main application layout with collapsible sidebar navigation,
 * topbar with search and user controls, and a content area for page rendering.
 */

/**
 * Inline SVG icon map — avoids bundling the entire lucide library.
 * Each value is a raw SVG string sized at 20×20 with currentColor stroke.
 * @type {Record<string, string>}
 */
const iconMap = {
  LayoutDashboard: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>`,
  ShoppingCart: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`,
  TrendingUp: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
  Package: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>`,
  Database: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>`,
  Search: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  LogOut: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  Menu: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`,
  ChevronLeft: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`,
  ChevronRight: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
  X: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  Bell: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
};

/** Navigation items configuration */
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '#/dashboard' },
  { id: 'buying', label: 'Buying', icon: 'ShoppingCart', path: '#/buying' },
  { id: 'selling', label: 'Selling', icon: 'TrendingUp', path: '#/selling' },
  { id: 'inventory', label: 'Inventory', icon: 'Package', path: '#/inventory' },
  { id: 'masters', label: 'Master Data', icon: 'Database', path: '#/masters' },
];

/**
 * Helper – creates an element from an SVG string and returns it.
 * @param {string} svgString
 * @returns {Element}
 */
function svgIcon(svgString) {
  const wrapper = document.createElement('span');
  wrapper.className = 'icon-wrapper';
  wrapper.innerHTML = svgString;
  return wrapper;
}

/**
 * Creates the main application shell layout.
 *
 * @param {HTMLElement} container - DOM element to render the shell into.
 * @param {Object} options
 * @param {function(string): void} options.onNavigate - Called with the page id when a nav item is clicked.
 * @param {function(): void} options.onLogout - Called when the user clicks logout.
 * @param {{ email: string, name?: string }} options.currentUser - The currently logged-in user.
 * @returns {{ setActivePage: function, setPageTitle: function, getContentArea: function, updateUser: function }}
 */
export function createAppShell(container, { onNavigate, onLogout, currentUser }) {
  // ── State ───────────────────────────────────────────────
  let collapsed = false;
  let activePageId = 'dashboard';
  let user = currentUser || { email: 'user@example.com' };

  // ── Root wrapper ────────────────────────────────────────
  const shell = document.createElement('div');
  shell.className = 'app-shell';

  // ─────────────────────── SIDEBAR ────────────────────────
  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';

  // Brand area
  const brand = document.createElement('div');
  brand.className = 'sidebar-brand';
  brand.innerHTML = `
    <div class="brand-logo">UV</div>
    <span class="brand-text">UV Sheet</span>
  `;
  sidebar.appendChild(brand);

  // Navigation list
  const nav = document.createElement('nav');
  nav.className = 'sidebar-nav';

  const navUl = document.createElement('ul');
  navUl.className = 'nav-list';

  NAV_ITEMS.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'nav-item';
    li.dataset.page = item.id;

    const a = document.createElement('a');
    a.href = item.path;
    a.className = 'nav-link';
    a.title = item.label;

    const iconEl = svgIcon(iconMap[item.icon]);
    iconEl.className = 'nav-icon';

    const label = document.createElement('span');
    label.className = 'nav-label';
    label.textContent = item.label;

    a.appendChild(iconEl);
    a.appendChild(label);
    li.appendChild(a);
    navUl.appendChild(li);

    a.addEventListener('click', (e) => {
      e.preventDefault();
      setActivePage(item.id);
      if (typeof onNavigate === 'function') onNavigate(item.path);
    });
  });

  nav.appendChild(navUl);
  sidebar.appendChild(nav);

  // Spacer pushes user info + collapse toggle to bottom
  const spacer = document.createElement('div');
  spacer.className = 'sidebar-spacer';
  sidebar.appendChild(spacer);

  // User info area
  const userInfo = document.createElement('div');
  userInfo.className = 'sidebar-user-info';

  const userAvatar = document.createElement('div');
  userAvatar.className = 'sidebar-user-avatar';
  userAvatar.textContent = (user.email || '?')[0].toUpperCase();

  const userEmail = document.createElement('span');
  userEmail.className = 'sidebar-user-email';
  userEmail.textContent = user.email || '';
  userEmail.title = user.email || '';

  userInfo.appendChild(userAvatar);
  userInfo.appendChild(userEmail);
  sidebar.appendChild(userInfo);

  // Collapse toggle
  const collapseBtn = document.createElement('button');
  collapseBtn.className = 'sidebar-collapse-btn btn btn-ghost';
  collapseBtn.title = 'Toggle sidebar';
  collapseBtn.innerHTML = iconMap.ChevronLeft;

  collapseBtn.addEventListener('click', () => {
    collapsed = !collapsed;
    sidebar.classList.toggle('sidebar--collapsed', collapsed);
    shell.classList.toggle('app-shell--collapsed', collapsed);
    collapseBtn.innerHTML = collapsed ? iconMap.ChevronRight : iconMap.ChevronLeft;
  });
  sidebar.appendChild(collapseBtn);

  shell.appendChild(sidebar);

  // ─────────────────────── MAIN AREA ──────────────────────
  const mainArea = document.createElement('div');
  mainArea.className = 'main-area';

  // ── Topbar ──
  const topbar = document.createElement('header');
  topbar.className = 'topbar';

  // Mobile menu toggle (hidden on desktop via CSS)
  const menuBtn = document.createElement('button');
  menuBtn.className = 'topbar-menu-btn btn btn-ghost';
  menuBtn.innerHTML = iconMap.Menu;
  menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('sidebar--mobile-open');
  });
  topbar.appendChild(menuBtn);

  // Page title
  const pageTitleEl = document.createElement('h1');
  pageTitleEl.className = 'topbar-title';
  pageTitleEl.textContent = 'Dashboard';
  topbar.appendChild(pageTitleEl);

  // Spacer
  const topSpacer = document.createElement('div');
  topSpacer.className = 'topbar-spacer';
  topbar.appendChild(topSpacer);

  // Global search
  const searchWrapper = document.createElement('div');
  searchWrapper.className = 'topbar-search';

  const searchIcon = svgIcon(iconMap.Search);
  searchIcon.className = 'topbar-search-icon';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'input topbar-search-input';
  searchInput.placeholder = 'Search…';

  searchWrapper.appendChild(searchIcon);
  searchWrapper.appendChild(searchInput);
  topbar.appendChild(searchWrapper);

  // Notification bell
  const bellBtn = document.createElement('button');
  bellBtn.className = 'topbar-icon-btn btn btn-ghost';
  bellBtn.innerHTML = iconMap.Bell;
  bellBtn.title = 'Notifications';
  topbar.appendChild(bellBtn);

  // User avatar & dropdown
  const avatarWrapper = document.createElement('div');
  avatarWrapper.className = 'topbar-avatar-wrapper';

  const avatarBtn = document.createElement('button');
  avatarBtn.className = 'topbar-avatar';
  avatarBtn.textContent = (user.email || '?')[0].toUpperCase();
  avatarBtn.title = user.email || '';

  const dropdown = document.createElement('div');
  dropdown.className = 'topbar-dropdown';
  dropdown.style.display = 'none';

  const dropdownEmail = document.createElement('div');
  dropdownEmail.className = 'topbar-dropdown-email';
  dropdownEmail.textContent = user.email || '';

  const dropdownDivider = document.createElement('hr');
  dropdownDivider.className = 'topbar-dropdown-divider';

  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'topbar-dropdown-item btn btn-ghost';
  const logoutIcon = svgIcon(iconMap.LogOut);
  logoutIcon.className = 'topbar-dropdown-item-icon';
  logoutBtn.appendChild(logoutIcon);
  const logoutLabel = document.createElement('span');
  logoutLabel.textContent = 'Log out';
  logoutBtn.appendChild(logoutLabel);

  logoutBtn.addEventListener('click', () => {
    dropdown.style.display = 'none';
    if (typeof onLogout === 'function') onLogout();
  });

  dropdown.appendChild(dropdownEmail);
  dropdown.appendChild(dropdownDivider);
  dropdown.appendChild(logoutBtn);

  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  });

  // Close dropdown when clicking elsewhere
  document.addEventListener('click', () => {
    dropdown.style.display = 'none';
  });

  avatarWrapper.appendChild(avatarBtn);
  avatarWrapper.appendChild(dropdown);
  topbar.appendChild(avatarWrapper);

  mainArea.appendChild(topbar);

  // ── Content area ──
  const contentArea = document.createElement('main');
  contentArea.className = 'main-content';
  mainArea.appendChild(contentArea);

  shell.appendChild(mainArea);

  // Close mobile sidebar when clicking overlay on the content area
  contentArea.addEventListener('click', () => {
    sidebar.classList.remove('sidebar--mobile-open');
  });

  // Mount into the target container
  container.innerHTML = '';
  container.appendChild(shell);

  // ── Initial active state ──
  setActivePage(activePageId);

  // ── Public API ──────────────────────────────────────────

  /**
   * Marks a navigation item as active and updates the page title.
   * @param {string} pageId - One of the NAV_ITEMS ids.
   */
  function setActivePage(pageId) {
    activePageId = pageId;
    navUl.querySelectorAll('.nav-item').forEach((li) => {
      li.classList.toggle('nav-item--active', li.dataset.page === pageId);
    });
    const found = NAV_ITEMS.find((n) => n.id === pageId);
    if (found) pageTitleEl.textContent = found.label;
  }

  /**
   * Override the topbar page title to any arbitrary string.
   * @param {string} title
   */
  function setPageTitle(title) {
    pageTitleEl.textContent = title;
  }

  /**
   * Returns the DOM element where page content should be rendered.
   * @returns {HTMLElement}
   */
  function getContentArea() {
    return contentArea;
  }

  /**
   * Update the displayed user information.
   * @param {{ email: string }} newUser
   */
  function updateUser(newUser) {
    user = newUser || user;
    const initial = (user.email || '?')[0].toUpperCase();
    avatarBtn.textContent = initial;
    avatarBtn.title = user.email || '';
    userAvatar.textContent = initial;
    userEmail.textContent = user.email || '';
    userEmail.title = user.email || '';
    dropdownEmail.textContent = user.email || '';
  }

  return { setActivePage, setPageTitle, getContentArea, updateUser };
}
