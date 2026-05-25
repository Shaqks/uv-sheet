/**
 * @module chart-wrapper
 * @description Chart.js wrapper with dark-theme defaults. Provides factory
 * functions for line, bar (vertical/horizontal), and doughnut charts.
 */

import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// ── Dark theme palette ────────────────────────────────────
const darkTheme = {
  textColor: '#94a3b8',
  gridColor: 'rgba(148,163,184,0.1)',
  tooltipBg: 'rgba(15,23,42,0.9)',
  tooltipBorder: 'rgba(148,163,184,0.2)',
};

/** Default set of colours for datasets */
const defaultColors = [
  'rgba(59,130,246,1)',   // blue
  'rgba(16,185,129,1)',   // green
  'rgba(245,158,11,1)',   // amber
  'rgba(239,68,68,1)',    // red
  'rgba(139,92,246,1)',   // violet
  'rgba(14,165,233,1)',   // sky
  'rgba(236,72,153,1)',   // pink
  'rgba(234,179,8,1)',    // yellow
];

/** Indian currency formatter for tooltips */
const currencyFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/**
 * Shared base scale options for dark theme.
 * @param {boolean} [stacked=false]
 * @returns {Object}
 */
function scaleDefaults(stacked = false) {
  return {
    x: {
      stacked,
      ticks: { color: darkTheme.textColor },
      grid: { color: darkTheme.gridColor },
    },
    y: {
      stacked,
      ticks: { color: darkTheme.textColor },
      grid: { color: darkTheme.gridColor },
      beginAtZero: true,
    },
  };
}

/**
 * Shared plugin defaults.
 * @returns {Object}
 */
function pluginDefaults() {
  return {
    legend: {
      labels: { color: darkTheme.textColor, usePointStyle: true, padding: 16 },
    },
    tooltip: {
      backgroundColor: darkTheme.tooltipBg,
      titleColor: '#e2e8f0',
      bodyColor: '#cbd5e1',
      borderColor: darkTheme.tooltipBorder,
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
    },
  };
}

/**
 * Ensures the container has a canvas to render into.
 * @param {HTMLElement} container
 * @param {number} [height=300]
 * @returns {HTMLCanvasElement}
 */
function ensureCanvas(container, height = 300) {
  container.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.height = height;
  container.appendChild(canvas);
  return canvas;
}

// ─────────────────────────────────────────────────────────
// LINE CHART
// ─────────────────────────────────────────────────────────

/**
 * Creates a line chart with smooth curves and gradient fill.
 *
 * @param {HTMLElement} container
 * @param {Object} opts
 * @param {string[]} opts.labels
 * @param {Array<{label:string, data:number[], color?:string, fill?:boolean}>} opts.datasets
 * @param {number} [opts.height=300]
 * @param {Object} [opts.options] - Additional Chart.js options to merge.
 * @returns {{ update: function, destroy: function }}
 */
export function createLineChart(container, { labels, datasets, height = 300, options = {} }) {
  const canvas = ensureCanvas(container, height);
  const ctx = canvas.getContext('2d');

  const chartDatasets = (datasets || []).map((ds, i) => {
    const baseColor = ds.color || defaultColors[i % defaultColors.length];
    // Create gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, baseColor.replace(/[\d.]+\)$/, '0.25)'));
    gradient.addColorStop(1, baseColor.replace(/[\d.]+\)$/, '0.02)'));

    return {
      label: ds.label || `Dataset ${i + 1}`,
      data: ds.data || [],
      borderColor: baseColor,
      backgroundColor: ds.fill !== false ? gradient : 'transparent',
      fill: ds.fill !== false,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: baseColor,
      borderWidth: 2,
    };
  });

  const chart = new Chart(ctx, {
    type: 'line',
    data: { labels: labels || [], datasets: chartDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: scaleDefaults(),
      plugins: {
        ...pluginDefaults(),
        tooltip: {
          ...pluginDefaults().tooltip,
          callbacks: {
            label: (context) => {
              const lbl = context.dataset.label || '';
              const val = currencyFmt.format(context.parsed.y);
              return `${lbl}: ${val}`;
            },
          },
        },
      },
      ...options,
    },
  });

  return {
    /**
     * Update chart data.
     * @param {string[]} newLabels
     * @param {Array<{label:string, data:number[]}>} newDatasets
     */
    update(newLabels, newDatasets) {
      chart.data.labels = newLabels || [];
      (newDatasets || []).forEach((ds, i) => {
        if (chart.data.datasets[i]) {
          chart.data.datasets[i].data = ds.data || [];
          if (ds.label) chart.data.datasets[i].label = ds.label;
        }
      });
      chart.update();
    },
    /** Destroy the chart instance and clear the canvas. */
    destroy() {
      chart.destroy();
      container.innerHTML = '';
    },
  };
}

// ─────────────────────────────────────────────────────────
// BAR CHART
// ─────────────────────────────────────────────────────────

/**
 * Creates a bar chart (vertical or horizontal).
 *
 * @param {HTMLElement} container
 * @param {Object} opts
 * @param {string[]} opts.labels
 * @param {number[]} opts.data
 * @param {string[]} [opts.colors]
 * @param {number} [opts.height=300]
 * @param {boolean} [opts.horizontal=false]
 * @param {Object} [opts.options]
 * @returns {{ update: function, destroy: function }}
 */
export function createBarChart(container, { labels, data, colors, height = 300, horizontal = false, options = {} }) {
  const canvas = ensureCanvas(container, height);
  const ctx = canvas.getContext('2d');

  const barColors = (colors && colors.length > 0)
    ? colors
    : (data || []).map((_, i) => defaultColors[i % defaultColors.length]);

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels || [],
      datasets: [
        {
          data: data || [],
          backgroundColor: barColors,
          borderColor: barColors.map((c) => c.replace(/[\d.]+\)$/, '1)')),
          borderWidth: 1,
          borderRadius: 6,
          maxBarThickness: 50,
        },
      ],
    },
    options: {
      indexAxis: horizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      scales: scaleDefaults(),
      plugins: {
        ...pluginDefaults(),
        legend: { display: false },
        tooltip: {
          ...pluginDefaults().tooltip,
          callbacks: {
            label: (context) => currencyFmt.format(context.parsed[horizontal ? 'x' : 'y']),
          },
        },
      },
      ...options,
    },
  });

  return {
    /**
     * Update bar chart data.
     * @param {string[]} newLabels
     * @param {number[]} newData
     */
    update(newLabels, newData) {
      chart.data.labels = newLabels || [];
      chart.data.datasets[0].data = newData || [];
      chart.update();
    },
    destroy() {
      chart.destroy();
      container.innerHTML = '';
    },
  };
}

// ─────────────────────────────────────────────────────────
// DOUGHNUT CHART
// ─────────────────────────────────────────────────────────

/**
 * Center text plugin – renders a total value in the doughnut hole.
 * @type {import('chart.js').Plugin}
 */
const centerTextPlugin = {
  id: 'centerText',
  afterDraw(chart) {
    if (chart.config.type !== 'doughnut') return;
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    const total = chart.data.datasets[0].data.reduce((sum, v) => sum + (v || 0), 0);
    const centerX = (chartArea.left + chartArea.right) / 2;
    const centerY = (chartArea.top + chartArea.bottom) / 2;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Total value
    ctx.font = 'bold 20px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(currencyFmt.format(total), centerX, centerY - 8);

    // Label
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillStyle = darkTheme.textColor;
    ctx.fillText('Total', centerX, centerY + 14);

    ctx.restore();
  },
};

Chart.register(centerTextPlugin);

/**
 * Creates a doughnut chart with center total text.
 *
 * @param {HTMLElement} container
 * @param {Object} opts
 * @param {string[]} opts.labels
 * @param {number[]} opts.data
 * @param {string[]} [opts.colors]
 * @param {number} [opts.height=300]
 * @param {Object} [opts.options]
 * @returns {{ update: function, destroy: function }}
 */
export function createDoughnutChart(container, { labels, data, colors, height = 300, options = {} }) {
  const canvas = ensureCanvas(container, height);
  const ctx = canvas.getContext('2d');

  const segmentColors = (colors && colors.length > 0)
    ? colors
    : (data || []).map((_, i) => defaultColors[i % defaultColors.length]);

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels || [],
      datasets: [
        {
          data: data || [],
          backgroundColor: segmentColors,
          borderColor: 'rgba(15,23,42,0.8)',
          borderWidth: 2,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        ...pluginDefaults(),
        legend: {
          position: 'bottom',
          labels: { color: darkTheme.textColor, usePointStyle: true, padding: 16 },
        },
        tooltip: {
          ...pluginDefaults().tooltip,
          callbacks: {
            label: (context) => {
              const lbl = context.label || '';
              const val = currencyFmt.format(context.parsed);
              return `${lbl}: ${val}`;
            },
          },
        },
      },
      ...options,
    },
  });

  return {
    /**
     * Update doughnut data.
     * @param {string[]} newLabels
     * @param {number[]} newData
     */
    update(newLabels, newData) {
      chart.data.labels = newLabels || [];
      chart.data.datasets[0].data = newData || [];
      chart.update();
    },
    destroy() {
      chart.destroy();
      container.innerHTML = '';
    },
  };
}
