/**
 * @module empty-state
 * @description Centered empty-state display with a large icon, title, description,
 * and optional action button. Used when a page or table has no data to show.
 */

/**
 * Creates an empty-state component inside the given container.
 *
 * @param {HTMLElement} container - Parent DOM element to render into.
 * @param {Object} opts
 * @param {string} [opts.icon] - SVG string for the illustration icon (rendered at 64px).
 * @param {string} [opts.title='No data'] - Main message.
 * @param {string} [opts.description=''] - Supporting subtitle text.
 * @param {string} [opts.actionText] - Label for the optional CTA button.
 * @param {function(): void} [opts.onAction] - Callback when the CTA button is clicked.
 * @returns {{ destroy: function }}
 */
export function createEmptyState(container, opts = {}) {
  const {
    icon = '',
    title = 'No data',
    description = '',
    actionText,
    onAction,
  } = opts;

  const wrapper = document.createElement('div');
  wrapper.className = 'empty-state';

  // Icon
  if (icon) {
    const iconEl = document.createElement('div');
    iconEl.className = 'empty-state-icon';
    iconEl.innerHTML = icon;
    wrapper.appendChild(iconEl);
  }

  // Title
  const titleEl = document.createElement('h3');
  titleEl.className = 'empty-state-title';
  titleEl.textContent = title;
  wrapper.appendChild(titleEl);

  // Description
  if (description) {
    const descEl = document.createElement('p');
    descEl.className = 'empty-state-description';
    descEl.textContent = description;
    wrapper.appendChild(descEl);
  }

  // Action button
  if (actionText) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary empty-state-action';
    btn.textContent = actionText;
    if (typeof onAction === 'function') {
      btn.addEventListener('click', onAction);
    }
    wrapper.appendChild(btn);
  }

  container.appendChild(wrapper);

  // Trigger fadeIn animation via class
  requestAnimationFrame(() => {
    wrapper.classList.add('empty-state--visible');
  });

  return {
    /** Remove the empty-state element from the DOM. */
    destroy() {
      wrapper.remove();
    },
  };
}
