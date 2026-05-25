/**
 * Dashboard Page — Executive overview with real-time metrics, charts, and leaderboards
 * @module pages/dashboard
 */

import { createStatCard } from '../components/stat-card.js';
import { createLineChart, createBarChart } from '../components/chart-wrapper.js';
import { createEmptyState } from '../components/empty-state.js';
import { showToast } from '../components/toast.js';
import { DashboardService } from '../services/dashboard.service.js';
import { formatCurrency, formatNumber, getCurrentFY, getLastFY } from '../utils/helpers.js';

const ICONS = {
  profit: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`,
  revenue: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  stock: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  orders: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  buyers: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
  suppliers: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  trophy: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 22V8a6 6 0 00-6-6h16a6 6 0 00-6 6v14"/></svg>`,
  down: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`,
};

/** @type {Function|null} Unsubscribe function for real-time listener */
let unsubscribe = null;
/** @type {Object|null} Chart instances for cleanup */
let charts = { trendChart: null, ordersChart: null };

/**
 * Renders the dashboard page
 * @param {HTMLElement} container - Content area element
 */
export function renderDashboardPage(container) {
  // Clean up previous listeners and charts
  cleanup();

  container.innerHTML = '';
  
  const page = document.createElement('div');
  page.className = 'page-dashboard';
  page.innerHTML = `
    <div class="dashboard-loading" id="dashboardLoading">
      <div class="skeleton-dashboard">
        <div class="skeleton skeleton-hero"></div>
        <div class="skeleton skeleton-chart"></div>
        <div class="skeleton-row-3">
          <div class="skeleton skeleton-card"></div>
          <div class="skeleton skeleton-card"></div>
          <div class="skeleton skeleton-card"></div>
        </div>
      </div>
    </div>
    <div class="dashboard-content" id="dashboardContent" style="display:none;">
      <!-- Profit Hero -->
      <div class="profit-hero glass-card" id="profitHero">
        <div class="profit-hero-label">Total Profit (All Time)</div>
        <div class="profit-hero-amount" id="profitAmount">₹0</div>
        <div class="profit-hero-trend" id="profitTrend"></div>
      </div>

      <!-- Monthly Trend Line -->
      <div class="chart-section glass-card">
        <h3 class="section-title">Monthly Profit Trend</h3>
        <div class="chart-container" id="trendChartContainer"></div>
      </div>

      <!-- FY Summaries -->
      <div class="fy-summaries">
        <div class="fy-card glass-card">
          <div class="fy-label">All Time Profit</div>
          <div class="fy-amount" id="fyAllTime">₹0</div>
        </div>
        <div class="fy-card glass-card">
          <div class="fy-label" id="lastFYLabel">Last FY Profit</div>
          <div class="fy-amount" id="fyLastYear">₹0</div>
        </div>
        <div class="fy-card glass-card">
          <div class="fy-label" id="currentFYLabel">Current FY Profit</div>
          <div class="fy-amount" id="fyCurrentYear">₹0</div>
        </div>
      </div>

      <!-- Metrics Row -->
      <div class="metrics-row">
        <div id="stockValueCard"></div>
        <div id="currentFYRevenueCard"></div>
        <div id="lastFYRevenueCard"></div>
        <div id="allTimeRevenueCard"></div>
      </div>

      <!-- Pending Orders -->
      <div class="chart-section glass-card">
        <h3 class="section-title">Orders by Status</h3>
        <div class="chart-container chart-container-sm" id="ordersChartContainer"></div>
      </div>

      <!-- Leaderboards -->
      <div class="leaderboards-grid">
        <div class="leaderboard glass-card">
          <h3 class="section-title">${ICONS.trophy} Top 5 Bestsellers</h3>
          <div class="leaderboard-list" id="topSellers"></div>
        </div>
        <div class="leaderboard glass-card">
          <h3 class="section-title">${ICONS.down} Bottom 5 Sellers</h3>
          <div class="leaderboard-list" id="worstSellers"></div>
        </div>
        <div class="leaderboard glass-card">
          <h3 class="section-title">${ICONS.suppliers} Top 5 Suppliers</h3>
          <div class="leaderboard-list" id="topSuppliers"></div>
        </div>
        <div class="leaderboard glass-card">
          <h3 class="section-title">${ICONS.buyers} Top 5 Buyers</h3>
          <div class="leaderboard-list" id="topBuyers"></div>
        </div>
      </div>
    </div>
  `;

  container.appendChild(page);

  // Set FY labels
  const currentFY = getCurrentFY();
  const lastFY = getLastFY();
  const lastFYLabel = page.querySelector('#lastFYLabel');
  const currentFYLabel = page.querySelector('#currentFYLabel');
  if (lastFYLabel) lastFYLabel.textContent = `${lastFY.label} Profit`;
  if (currentFYLabel) currentFYLabel.textContent = `${currentFY.label} Profit`;

  // Subscribe to real-time dashboard data
  loadDashboard(page);
}

/**
 * Loads dashboard data and sets up real-time listener
 * @param {HTMLElement} page - The dashboard page element
 */
async function loadDashboard(page) {
  const loadingEl = page.querySelector('#dashboardLoading');
  const contentEl = page.querySelector('#dashboardContent');

  try {
    unsubscribe = DashboardService.subscribe((data) => {
      // Hide loading, show content
      if (loadingEl) loadingEl.style.display = 'none';
      if (contentEl) contentEl.style.display = 'block';

      updateProfitHero(page, data);
      updateTrendChart(page, data.monthlyTrend);
      updateFYSummaries(page, data);
      updateMetricCards(page, data);
      updateOrdersChart(page, data.ordersByStatus);
      updateLeaderboards(page, data);
    });
  } catch (err) {
    console.error('Dashboard load error:', err);
    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) {
      contentEl.style.display = 'block';
      contentEl.innerHTML = '';
      createEmptyState(contentEl, {
        icon: ICONS.revenue,
        title: 'Unable to load dashboard',
        description: 'There was an error loading the dashboard data. Please refresh the page.',
        actionText: 'Refresh',
        onAction: () => window.location.reload(),
      });
    }
  }
}

/**
 * Updates the hero profit display
 */
function updateProfitHero(page, data) {
  const amountEl = page.querySelector('#profitAmount');
  const trendEl = page.querySelector('#profitTrend');
  const heroEl = page.querySelector('#profitHero');

  if (!amountEl) return;

  const profit = data.allTimeProfit || 0;
  amountEl.textContent = formatCurrency(profit);
  amountEl.className = `profit-hero-amount ${profit >= 0 ? 'text-success' : 'text-danger'}`;

  // Add/remove profit/loss class on hero card
  if (heroEl) {
    heroEl.classList.toggle('profit-positive', profit >= 0);
    heroEl.classList.toggle('profit-negative', profit < 0);
  }

  // Month-over-month trend
  if (trendEl && data.monthlyTrend && data.monthlyTrend.length >= 2) {
    const current = data.monthlyTrend[data.monthlyTrend.length - 1];
    const previous = data.monthlyTrend[data.monthlyTrend.length - 2];
    if (previous && previous.profit !== 0) {
      const change = ((current.profit - previous.profit) / Math.abs(previous.profit)) * 100;
      const isUp = change >= 0;
      trendEl.innerHTML = `<span class="${isUp ? 'text-success' : 'text-danger'}">${isUp ? '↑' : '↓'} ${Math.abs(change).toFixed(1)}% vs last month</span>`;
    } else {
      trendEl.innerHTML = '';
    }
  }
}

/**
 * Updates the monthly profit trend line chart
 */
function updateTrendChart(page, monthlyTrend) {
  const container = page.querySelector('#trendChartContainer');
  if (!container || !monthlyTrend) return;

  const labels = monthlyTrend.map(m => m.label);
  const profitData = monthlyTrend.map(m => m.profit);
  const revenueData = monthlyTrend.map(m => m.revenue);
  const costData = monthlyTrend.map(m => m.cost);

  if (charts.trendChart) {
    charts.trendChart.update(labels, [
      { label: 'Profit', data: profitData, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)' },
      { label: 'Revenue', data: revenueData, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)' },
      { label: 'Cost', data: costData, borderColor: '#f43f5e', backgroundColor: 'rgba(244,63,94,0.1)' },
    ]);
  } else {
    charts.trendChart = createLineChart(container, {
      labels,
      datasets: [
        { label: 'Profit', data: profitData, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)' },
        { label: 'Revenue', data: revenueData, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)' },
        { label: 'Cost', data: costData, borderColor: '#f43f5e', backgroundColor: 'rgba(244,63,94,0.1)' },
      ],
      height: 300,
    });
  }
}

/**
 * Updates the FY summary cards
 */
function updateFYSummaries(page, data) {
  const allTimeEl = page.querySelector('#fyAllTime');
  const lastFYEl = page.querySelector('#fyLastYear');
  const currentFYEl = page.querySelector('#fyCurrentYear');

  if (allTimeEl) {
    allTimeEl.textContent = formatCurrency(data.allTimeProfit || 0);
    allTimeEl.className = `fy-amount ${(data.allTimeProfit || 0) >= 0 ? 'text-success' : 'text-danger'}`;
  }
  if (lastFYEl) {
    lastFYEl.textContent = formatCurrency(data.lastFYProfit || 0);
    lastFYEl.className = `fy-amount ${(data.lastFYProfit || 0) >= 0 ? 'text-success' : 'text-danger'}`;
  }
  if (currentFYEl) {
    currentFYEl.textContent = formatCurrency(data.currentFYProfit || 0);
    currentFYEl.className = `fy-amount ${(data.currentFYProfit || 0) >= 0 ? 'text-success' : 'text-danger'}`;
  }
}

/**
 * Updates the metric stat cards
 */
function updateMetricCards(page, data) {
  // Stock Value Card
  const stockContainer = page.querySelector('#stockValueCard');
  if (stockContainer) {
    stockContainer.innerHTML = '';
    createStatCard(stockContainer, {
      icon: ICONS.stock,
      title: 'Total Stock Value',
      value: data.totalStockValue || 0,
      format: 'currency',
      color: 'accent',
    });
  }

  // Current FY Revenue
  const currentRevContainer = page.querySelector('#currentFYRevenueCard');
  if (currentRevContainer) {
    currentRevContainer.innerHTML = '';
    createStatCard(currentRevContainer, {
      icon: ICONS.revenue,
      title: `${getCurrentFY().label} Revenue`,
      value: data.currentFYRevenue || 0,
      format: 'currency',
      color: 'success',
    });
  }

  // Last FY Revenue
  const lastRevContainer = page.querySelector('#lastFYRevenueCard');
  if (lastRevContainer) {
    lastRevContainer.innerHTML = '';
    createStatCard(lastRevContainer, {
      icon: ICONS.revenue,
      title: `${getLastFY().label} Revenue`,
      value: data.lastFYRevenue || 0,
      format: 'currency',
      color: 'info',
    });
  }

  // All Time Revenue
  const allRevContainer = page.querySelector('#allTimeRevenueCard');
  if (allRevContainer) {
    allRevContainer.innerHTML = '';
    createStatCard(allRevContainer, {
      icon: ICONS.revenue,
      title: 'All Time Revenue',
      value: data.allTimeRevenue || 0,
      format: 'currency',
      color: 'warning',
    });
  }
}

/**
 * Updates the orders by status horizontal bar chart
 */
function updateOrdersChart(page, ordersByStatus) {
  const container = page.querySelector('#ordersChartContainer');
  if (!container || !ordersByStatus) return;

  const statusLabels = Object.keys(ordersByStatus);
  const statusData = Object.values(ordersByStatus);
  const statusColors = {
    'Pending': '#f59e0b',
    'Confirmed': '#3b82f6',
    'Shipped': '#06b6d4',
    'Delivered': '#10b981',
    'Cancelled': '#f43f5e',
  };
  const colors = statusLabels.map(s => statusColors[s] || '#94a3b8');

  if (charts.ordersChart) {
    charts.ordersChart.update(statusLabels, statusData);
  } else {
    charts.ordersChart = createBarChart(container, {
      labels: statusLabels,
      data: statusData,
      colors,
      height: 200,
      horizontal: true,
    });
  }
}

/**
 * Updates all leaderboard lists
 */
function updateLeaderboards(page, data) {
  renderLeaderboard(page.querySelector('#topSellers'), data.topProducts, 'revenue');
  renderLeaderboard(page.querySelector('#worstSellers'), data.worstProducts, 'revenue');
  renderLeaderboard(page.querySelector('#topSuppliers'), data.topSuppliers, 'total');
  renderLeaderboard(page.querySelector('#topBuyers'), data.topBuyers, 'total');
}

/**
 * Renders a single leaderboard list
 */
function renderLeaderboard(container, items, valueKey) {
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `<div class="leaderboard-empty">No data yet</div>`;
    return;
  }

  container.innerHTML = items.map((item, i) => `
    <div class="leaderboard-item">
      <div class="leaderboard-rank">${i + 1}</div>
      <div class="leaderboard-info">
        <div class="leaderboard-name">${escapeHTML(item.name)}</div>
        ${item.category ? `<div class="leaderboard-meta">${escapeHTML(item.category)}</div>` : ''}
      </div>
      <div class="leaderboard-value">${formatCurrency(item[valueKey] || 0)}</div>
    </div>
  `).join('');
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

/**
 * Cleans up dashboard listeners and chart instances
 */
export function cleanup() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  if (charts.trendChart) {
    charts.trendChart.destroy();
    charts.trendChart = null;
  }
  if (charts.ordersChart) {
    charts.ordersChart.destroy();
    charts.ordersChart = null;
  }
}
