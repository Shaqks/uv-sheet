/**
 * @module toast
 * @description Singleton toast notification system. Toasts are stacked at the
 * top-right of the viewport with slide-in animation and auto-dismiss.
 */

/** Container element – lazily created on first call. */
let toastContainer = null;

/** Icon map for each toast type */
const toastIcons = {
  success: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  error: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`,
  warning: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
};

/** Close icon */
const closeIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

/**
 * Ensures the toast container exists in the DOM.
 * @returns {HTMLElement}
 */
function getContainer() {
  if (toastContainer && document.body.contains(toastContainer)) return toastContainer;

  toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  toastContainer.setAttribute('aria-live', 'polite');
  toastContainer.setAttribute('aria-atomic', 'false');
  document.body.appendChild(toastContainer);
  return toastContainer;
}

/**
 * Show a toast notification.
 *
 * @param {string} message - The message to display.
 * @param {'success'|'error'|'warning'|'info'} [type='info'] - The visual type.
 * @param {number} [duration=4000] - Auto-dismiss delay in ms. Pass 0 to disable auto-dismiss.
 */
export function showToast(message, type = 'info', duration = 4000) {
  const container = getContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');

  // Icon
  const iconWrapper = document.createElement('span');
  iconWrapper.className = 'toast-icon';
  iconWrapper.innerHTML = toastIcons[type] || toastIcons.info;
  toast.appendChild(iconWrapper);

  // Message
  const msg = document.createElement('span');
  msg.className = 'toast-message';
  msg.textContent = message;
  toast.appendChild(msg);

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close btn btn-ghost btn-icon';
  closeBtn.innerHTML = closeIconSvg;
  closeBtn.title = 'Dismiss';
  closeBtn.addEventListener('click', () => dismiss(toast));
  toast.appendChild(closeBtn);

  container.appendChild(toast);

  // Trigger slide-in animation via class
  requestAnimationFrame(() => {
    toast.classList.add('toast--visible');
  });

  // Auto-dismiss
  let timer = null;
  if (duration > 0) {
    timer = setTimeout(() => dismiss(toast), duration);
  }

  // Pause auto-dismiss on hover
  toast.addEventListener('mouseenter', () => {
    if (timer) clearTimeout(timer);
  });
  toast.addEventListener('mouseleave', () => {
    if (duration > 0) {
      timer = setTimeout(() => dismiss(toast), duration);
    }
  });
}

/**
 * Dismiss a single toast element with exit animation.
 * @param {HTMLElement} toast
 */
function dismiss(toast) {
  if (!toast || !toast.parentNode) return;
  toast.classList.add('toast--dismissing');
  toast.classList.remove('toast--visible');
  // Remove from DOM after animation completes
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
    // Clean up container if empty
    if (toastContainer && toastContainer.children.length === 0) {
      toastContainer.remove();
      toastContainer = null;
    }
  }, 300);
}
