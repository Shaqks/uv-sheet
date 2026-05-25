/**
 * @module stat-card
 * @description Dashboard stat card with animated count-up, trend indicator
 * (compared to previousValue), glassmorphism styling, and Indian formatting.
 */

/** Indian currency formatter */
const currencyFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** Indian number formatter */
const numberFmt = new Intl.NumberFormat('en-IN');

/**
 * Format a number based on the given format type.
 * @param {number} value
 * @param {'currency'|'number'|'percentage'} format
 * @returns {string}
 */
function formatValue(value, format) {
  if (value == null || isNaN(value)) return '—';
  switch (format) {
    case 'currency':
      return currencyFmt.format(value);
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'number':
    default:
      return numberFmt.format(Math.round(value));
  }
}

/**
 * Easing function — easeOutExpo for a satisfying count-up.
 * @param {number} t - Progress 0–1
 * @returns {number}
 */
function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * Creates a stat card component.
 *
 * @param {HTMLElement} container
 * @param {Object} opts
 * @param {string} [opts.icon] - SVG string for the card icon.
 * @param {string} opts.title - Metric title (e.g. "Total Revenue").
 * @param {number} opts.value - Current numeric value.
 * @param {number} [opts.previousValue] - Previous value for trend calculation.
 * @param {'currency'|'number'|'percentage'} [opts.format='number']
 * @param {'accent'|'success'|'danger'|'warning'|'info'} [opts.color='accent']
 * @param {string} [opts.subtitle] - Optional descriptive subtitle.
 * @returns {{ update: function, destroy: function }}
 */
export function createStatCard(container, opts = {}) {
  const {
    icon = '',
    title = '',
    value = 0,
    previousValue,
    format = 'number',
    color = 'accent',
    subtitle = '',
  } = opts;

  // ── DOM ──
  const card = document.createElement('div');
  card.className = `glass-card stat-card stat-card--${color}`;

  // Header: icon + title
  const header = document.createElement('div');
  header.className = 'stat-card-header';

  if (icon) {
    const iconEl = document.createElement('div');
    iconEl.className = `stat-card-icon stat-card-icon--${color}`;
    iconEl.innerHTML = icon;
    header.appendChild(iconEl);
  }

  const titleEl = document.createElement('span');
  titleEl.className = 'stat-card-title';
  titleEl.textContent = title;
  header.appendChild(titleEl);

  card.appendChild(header);

  // Value
  const valueEl = document.createElement('div');
  valueEl.className = 'stat-card-value';
  valueEl.textContent = formatValue(0, format);
  card.appendChild(valueEl);

  // Trend
  const trendEl = document.createElement('div');
  trendEl.className = 'stat-card-trend';
  card.appendChild(trendEl);

  // Subtitle
  const subtitleEl = document.createElement('div');
  subtitleEl.className = 'stat-card-subtitle';
  subtitleEl.textContent = subtitle;
  if (subtitle) card.appendChild(subtitleEl);

  container.appendChild(card);

  // ── Animate count-up ──
  let animationId = null;

  function animateCountUp(targetValue) {
    if (animationId) cancelAnimationFrame(animationId);

    const duration = 1500; // ms
    const startTime = performance.now();
    const startValue = 0;

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);
      const currentValue = startValue + (targetValue - startValue) * easedProgress;
      valueEl.textContent = formatValue(currentValue, format);

      if (progress < 1) {
        animationId = requestAnimationFrame(tick);
      } else {
        valueEl.textContent = formatValue(targetValue, format);
        animationId = null;
      }
    }

    animationId = requestAnimationFrame(tick);
  }

  // ── Trend computation ──
  function renderTrend(current, previous) {
    trendEl.innerHTML = '';
    if (previous == null || previous === 0) return;

    const change = ((current - previous) / Math.abs(previous)) * 100;
    const isPositive = change > 0;
    const isNegative = change < 0;

    trendEl.className = 'stat-card-trend';
    if (isPositive) {
      trendEl.classList.add('stat-card-trend--up');
      trendEl.textContent = `↑ ${Math.abs(change).toFixed(1)}%`;
    } else if (isNegative) {
      trendEl.classList.add('stat-card-trend--down');
      trendEl.textContent = `↓ ${Math.abs(change).toFixed(1)}%`;
    } else {
      trendEl.classList.add('stat-card-trend--neutral');
      trendEl.textContent = `— 0%`;
    }
  }

  // Initial render
  animateCountUp(value);
  renderTrend(value, previousValue);

  // ── Public API ──

  /**
   * Update the card value and trend.
   * @param {{ value?: number, previousValue?: number }} newOpts
   */
  function update(newOpts = {}) {
    const newValue = newOpts.value != null ? newOpts.value : value;
    const newPrev = newOpts.previousValue != null ? newOpts.previousValue : previousValue;
    animateCountUp(newValue);
    renderTrend(newValue, newPrev);
  }

  /** Remove the card from the DOM. */
  function destroy() {
    if (animationId) cancelAnimationFrame(animationId);
    card.remove();
  }

  return { update, destroy };
}
