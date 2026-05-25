/**
 * Inventory Page — Auto-calculated stock view from purchases and sales
 * @module pages/inventory
 */

import { createDataTable } from '../components/data-table.js';
import { createFilterBar } from '../components/filters.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { createStatCard } from '../components/stat-card.js';
import { InventoryService } from '../services/inventory.service.js';
import { CategoryService } from '../services/category.service.js';
import { formatCurrency, formatDate } from '../utils/helpers.js';
import { exportToExcel, exportToCSV } from '../utils/export.js';

let unsubscribeInventory = null;
let unsubscribeCategories = null;

let tableInstance = null;
let filterBarInstance = null;
let allInventory = [];
let allCategories = [];

const ICONS = {
  stock: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  value: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`,
  products: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`,
};

/**
 * Renders the inventory page
 * @param {HTMLElement} container - Content area
 */
export function renderInventoryPage(container) {
  cleanup();
  container.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'page-inventory';

  // Page Header
  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `
    <div class="page-header-left">
      <h1 class="page-title">Inventory</h1>
      <span class="page-subtitle" id="inventoryCount">Loading...</span>
    </div>
    <div class="page-header-actions">
      <button class="btn btn-ghost" id="showLowStockBtn">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Low Stock Only
      </button>
      <button class="btn btn-ghost" id="exportCSVBtn">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        CSV
      </button>
      <button class="btn btn-ghost" id="exportExcelBtn">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Excel
      </button>
    </div>
  `;
  page.appendChild(header);

  // Metric Cards
  const metricsRow = document.createElement('div');
  metricsRow.className = 'metrics-row';
  metricsRow.innerHTML = `
    <div id="totalProductsCard"></div>
    <div id="totalStockValueCard"></div>
    <div id="lowStockCard"></div>
    <div id="outOfStockCard"></div>
  `;
  page.appendChild(metricsRow);

  // Filter Bar
  const filterContainer = document.createElement('div');
  filterContainer.className = 'filter-section';
  page.appendChild(filterContainer);

  filterBarInstance = createFilterBar(filterContainer, {
    showDateRange: false,
    showCategory: true,
    showStatus: false,
    showSearch: true,
    categories: allCategories.map(c => c.name),
    onChange: (filters) => applyFilters(filters),
  });

  // Table
  const tableContainer = document.createElement('div');
  tableContainer.className = 'table-section';
  page.appendChild(tableContainer);

  const columns = [
    { key: 'category', label: 'Category', type: 'text', sortable: true, width: '120px' },
    { key: 'productId', label: 'Product ID', type: 'text', sortable: true, width: '100px' },
    { key: 'productName', label: 'Product Name', type: 'text', sortable: true },
    { key: 'productUse', label: 'Use', type: 'text', width: '110px' },
    { key: 'totalBought', label: 'Bought', type: 'number', sortable: true, width: '80px', align: 'right' },
    { key: 'totalSold', label: 'Sold', type: 'number', sortable: true, width: '80px', align: 'right' },
    { key: 'balanceStock', label: 'Balance', type: 'number', sortable: true, width: '90px', align: 'right' },
    { key: 'stockValue', label: 'Stock Value', type: 'currency', sortable: true, width: '120px', align: 'right' },
    { key: 'reorderLevel', label: 'Reorder Level', type: 'number', width: '100px', align: 'right' },
    { key: 'stockStatus', label: 'Status', type: 'status', sortable: true, width: '110px' },
    { key: 'lastRestockDate', label: 'Last Restock', type: 'date', sortable: true, width: '110px' },
    { key: 'warehouseLocation', label: 'Location', type: 'text', width: '110px' },
  ];

  tableInstance = createDataTable(tableContainer, {
    columns,
    data: [],
    pageSize: 50,
    onRowClick: (row) => showProductHistory(row),
    emptyMessage: 'No inventory data. Start by adding products and recording purchases.',
    emptyIcon: ICONS.stock,
  });

  container.appendChild(page);

  // Event listeners
  let lowStockOnly = false;
  const lowStockBtn = page.querySelector('#showLowStockBtn');
  lowStockBtn.addEventListener('click', () => {
    lowStockOnly = !lowStockOnly;
    lowStockBtn.classList.toggle('btn-active', lowStockOnly);
    if (filterBarInstance) applyFilters(filterBarInstance.getFilters());
  });

  page.querySelector('#exportCSVBtn').addEventListener('click', () => exportData('csv'));
  page.querySelector('#exportExcelBtn').addEventListener('click', () => exportData('excel'));

  // Subscribe to data
  subscribeToData(page, () => lowStockOnly);
}

function subscribeToData(page, getLowStockOnly) {
  unsubscribeCategories = CategoryService.subscribe((categories) => {
    allCategories = categories;
    if (filterBarInstance) filterBarInstance.setCategories(categories.map(c => c.name));
  });

  unsubscribeInventory = InventoryService.subscribe((inventory) => {
    // Add stockStatus field for display
    allInventory = inventory.map(item => ({
      ...item,
      stockStatus: item.balanceStock <= 0 ? 'Out of Stock'
        : item.isLowStock ? 'Low Stock'
        : item.isWarning ? 'Warning'
        : 'In Stock',
    }));

    if (filterBarInstance) {
      applyFiltersWithLowStock(filterBarInstance.getFilters(), getLowStockOnly());
    } else {
      updateTable(allInventory);
    }
    updateMetrics(page, allInventory);
    updateCount(page, allInventory);
  });
}

function applyFilters(filters) {
  applyFiltersWithLowStock(filters, false);
}

function applyFiltersWithLowStock(filters, lowStockOnly) {
  let filtered = [...allInventory];

  if (lowStockOnly) {
    filtered = filtered.filter(item => item.isLowStock || item.balanceStock <= 0);
  }

  if (filters.category && filters.category !== 'All') {
    filtered = filtered.filter(item => item.category === filters.category);
  }

  if (filters.search) {
    const query = filters.search.toLowerCase();
    filtered = filtered.filter(item =>
      (item.productName || '').toLowerCase().includes(query) ||
      (item.productId || '').toLowerCase().includes(query) ||
      (item.category || '').toLowerCase().includes(query) ||
      (item.warehouseLocation || '').toLowerCase().includes(query)
    );
  }

  updateTable(filtered);
}

function updateTable(data) {
  if (tableInstance) {
    tableInstance.setData(data);
    tableInstance.setLoading(false);
  }
}

function updateMetrics(page, inventory) {
  const totalProducts = inventory.length;
  const totalStockValue = inventory.reduce((sum, item) => sum + (item.stockValue || 0), 0);
  const lowStockCount = inventory.filter(item => item.isLowStock && item.balanceStock > 0).length;
  const outOfStockCount = inventory.filter(item => item.balanceStock <= 0).length;

  const productsCard = page.querySelector('#totalProductsCard');
  if (productsCard) {
    productsCard.innerHTML = '';
    createStatCard(productsCard, { icon: ICONS.products, title: 'Total Products', value: totalProducts, format: 'number', color: 'accent' });
  }

  const valueCard = page.querySelector('#totalStockValueCard');
  if (valueCard) {
    valueCard.innerHTML = '';
    createStatCard(valueCard, { icon: ICONS.value, title: 'Total Stock Value', value: totalStockValue, format: 'currency', color: 'success' });
  }

  const lowCard = page.querySelector('#lowStockCard');
  if (lowCard) {
    lowCard.innerHTML = '';
    createStatCard(lowCard, { icon: ICONS.warning, title: 'Low Stock Items', value: lowStockCount, format: 'number', color: 'warning' });
  }

  const outCard = page.querySelector('#outOfStockCard');
  if (outCard) {
    outCard.innerHTML = '';
    createStatCard(outCard, { icon: ICONS.stock, title: 'Out of Stock', value: outOfStockCount, format: 'number', color: 'danger' });
  }
}

function updateCount(page, inventory) {
  const count = page.querySelector('#inventoryCount');
  if (count) count.textContent = `${inventory.length} products tracked`;
}

/**
 * Show transaction history for a product
 */
async function showProductHistory(row) {
  try {
    const history = await InventoryService.getProductHistory(row.productId);

    const fields = [
      { key: 'info', label: 'Product Info', type: 'text', readOnly: true, value: `${row.productId} — ${row.productName}` },
      { key: 'balance', label: 'Balance Stock', type: 'number', readOnly: true, value: row.balanceStock },
      { key: 'stockValue', label: 'Stock Value', type: 'text', readOnly: true, value: formatCurrency(row.stockValue || 0) },
    ];

    // Create a simple read-only modal showing history
    openModal({
      title: `Product History — ${row.productName}`,
      fields,
      data: null,
      customContent: createHistoryTable(history),
      onSave: null, // Read-only, no save
      onCancel: () => {},
    });
  } catch (err) {
    showToast('Failed to load product history', 'error');
  }
}

function createHistoryTable(history) {
  if (!history || history.length === 0) {
    return '<div class="empty-state-inline">No transactions found for this product.</div>';
  }

  let html = '<div class="history-table-wrapper"><table class="history-table"><thead><tr>';
  html += '<th>Date</th><th>Type</th><th>Qty</th><th>Rate</th><th>Total</th><th>Status</th><th>Party</th>';
  html += '</tr></thead><tbody>';

  history.forEach(txn => {
    const isPurchase = txn.type === 'purchase';
    const date = txn.date instanceof Date ? txn.date : new Date(txn.date);
    html += `<tr class="history-row ${isPurchase ? 'history-purchase' : 'history-sale'}">`;
    html += `<td>${formatDate(date)}</td>`;
    html += `<td><span class="badge ${isPurchase ? 'badge-confirmed' : 'badge-shipped'}">${isPurchase ? 'Purchase' : 'Sale'}</span></td>`;
    html += `<td class="text-right">${txn.quantity}</td>`;
    html += `<td class="text-right">${formatCurrency(txn.rate || 0)}</td>`;
    html += `<td class="text-right">${formatCurrency(txn.total || 0)}</td>`;
    html += `<td><span class="badge badge-${(txn.status || '').toLowerCase()}">${txn.status || ''}</span></td>`;
    html += `<td>${escapeHTML(txn.party || '')}</td>`;
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  return html;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function exportData(format) {
  const data = tableInstance ? tableInstance.getCurrentData() : allInventory;
  const exportColumns = [
    { key: 'category', label: 'Category' },
    { key: 'productId', label: 'Product ID' },
    { key: 'productName', label: 'Product Name' },
    { key: 'productUse', label: 'Product Use' },
    { key: 'totalBought', label: 'Total Bought' },
    { key: 'totalSold', label: 'Total Sold' },
    { key: 'balanceStock', label: 'Balance Stock' },
    { key: 'stockValue', label: 'Stock Value', format: 'currency' },
    { key: 'reorderLevel', label: 'Reorder Level' },
    { key: 'stockStatus', label: 'Status' },
    { key: 'lastRestockDate', label: 'Last Restock Date', format: 'date' },
    { key: 'warehouseLocation', label: 'Warehouse Location' },
  ];

  if (format === 'csv') {
    exportToCSV(data, exportColumns, 'UV_Inventory');
  } else {
    exportToExcel(data, exportColumns, 'UV_Inventory');
  }
  showToast(`Inventory exported to ${format.toUpperCase()}`, 'success');
}

export function cleanup() {
  if (unsubscribeInventory) { unsubscribeInventory(); unsubscribeInventory = null; }
  if (unsubscribeCategories) { unsubscribeCategories(); unsubscribeCategories = null; }
  if (tableInstance) { tableInstance.destroy(); tableInstance = null; }
  if (filterBarInstance) { filterBarInstance.destroy(); filterBarInstance = null; }
  allInventory = [];
}
