/**
 * Buying Page — Purchase transaction management with full CRUD, filtering, and real-time sync
 * @module pages/buying
 */

import { createDataTable } from '../components/data-table.js';
import { createFilterBar } from '../components/filters.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { createEmptyState } from '../components/empty-state.js';
import { PurchaseService } from '../services/purchase.service.js';
import { ProductService } from '../services/product.service.js';
import { SupplierService } from '../services/supplier.service.js';
import { CategoryService } from '../services/category.service.js';
import { formatCurrency, formatDate } from '../utils/helpers.js';
import { exportToExcel, exportToCSV } from '../utils/export.js';
import { ORDER_STATUSES } from '../utils/constants.js';

/** @type {Function|null} */
let unsubscribePurchases = null;
let unsubscribeProducts = null;
let unsubscribeSuppliers = null;
let unsubscribeCategories = null;

let tableInstance = null;
let filterBarInstance = null;
let allPurchases = [];
let allProducts = [];
let allSuppliers = [];
let allCategories = [];

/**
 * Renders the buying sheet page
 * @param {HTMLElement} container - Content area
 */
export function renderBuyingPage(container) {
  cleanup();
  container.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'page-buying';

  // Page Header
  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `
    <div class="page-header-left">
      <h1 class="page-title">Purchases</h1>
      <span class="page-subtitle" id="purchaseCount">Loading...</span>
    </div>
    <div class="page-header-actions">
      <button class="btn btn-ghost" id="exportCSVBtn" title="Export to CSV">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        CSV
      </button>
      <button class="btn btn-ghost" id="exportExcelBtn" title="Export to Excel">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Excel
      </button>
      <button class="btn btn-primary" id="addPurchaseBtn">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Purchase
      </button>
    </div>
  `;
  page.appendChild(header);

  // Summary Strip
  const summary = document.createElement('div');
  summary.className = 'transaction-summary glass-card';
  summary.id = 'purchaseSummary';
  summary.innerHTML = `
    <div class="summary-item">
      <span class="summary-label">Total Records</span>
      <span class="summary-value" id="summaryTotalRecords">0</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Total Purchase Value</span>
      <span class="summary-value" id="summaryTotalValue">₹0</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Pending Orders</span>
      <span class="summary-value text-warning" id="summaryPending">0</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Delivered</span>
      <span class="summary-value text-success" id="summaryDelivered">0</span>
    </div>
  `;
  page.appendChild(summary);

  // Filter Bar
  const filterContainer = document.createElement('div');
  filterContainer.className = 'filter-section';
  page.appendChild(filterContainer);

  filterBarInstance = createFilterBar(filterContainer, {
    showDateRange: true,
    showCategory: true,
    showStatus: true,
    showSearch: true,
    categories: allCategories.map(c => c.name),
    onChange: (filters) => applyFilters(filters),
  });

  // Table Container
  const tableContainer = document.createElement('div');
  tableContainer.className = 'table-section';
  page.appendChild(tableContainer);

  // Define columns
  const columns = [
    { key: 'date', label: 'Date', type: 'date', sortable: true, width: '100px' },
    { key: 'id', label: 'Purchase ID', type: 'text', sortable: true, width: '110px' },
    { key: 'category', label: 'Category', type: 'text', sortable: true, width: '110px' },
    { key: 'productName', label: 'Product', type: 'text', sortable: true },
    { key: 'productUse', label: 'Use', type: 'text', width: '100px' },
    { key: 'supplierName', label: 'Supplier', type: 'text', sortable: true },
    { key: 'supplierLocation', label: 'Location', type: 'text', width: '110px' },
    { key: 'quantity', label: 'Qty', type: 'number', sortable: true, width: '70px', align: 'right' },
    { key: 'buyingCostPerUnit', label: 'Cost/Unit', type: 'currency', sortable: true, width: '100px', align: 'right' },
    { key: 'buyingTransportCost', label: 'Transport', type: 'currency', width: '100px', align: 'right' },
    { key: 'totalPurchaseCost', label: 'Total Cost', type: 'currency', sortable: true, width: '110px', align: 'right' },
    { key: 'status', label: 'Status', type: 'status', sortable: true, width: '110px' },
    { key: '_actions', label: '', type: 'actions', width: '80px' },
  ];

  tableInstance = createDataTable(tableContainer, {
    columns,
    data: [],
    pageSize: 25,
    onRowClick: (row) => openPurchaseForm(row),
    onEdit: (row) => openPurchaseForm(row),
    onDelete: (row) => confirmDelete(row),
    bulkActions: [
      {
        label: 'Delete Selected',
        class: 'btn-danger',
        onClick: async (rows) => {
          if (confirm(`Are you sure you want to delete ${rows.length} selected purchases?\n\nThis action cannot be undone.`)) {
            try {
              for (const row of rows) {
                await PurchaseService.remove(row.firebaseId || row.id);
              }
              showToast(`Successfully deleted ${rows.length} purchases`, 'success');
              if (tableInstance) tableInstance.clearSelection();
            } catch (err) {
              showToast(`Error deleting some purchases: ${err.message}`, 'error');
            }
          }
        }
      }
    ],
    emptyMessage: 'No purchases recorded yet',
    emptyIcon: `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
  });

  container.appendChild(page);

  // Event listeners
  page.querySelector('#addPurchaseBtn').addEventListener('click', () => openPurchaseForm(null));
  page.querySelector('#exportCSVBtn').addEventListener('click', () => exportData('csv'));
  page.querySelector('#exportExcelBtn').addEventListener('click', () => exportData('excel'));

  // Load data
  subscribeToData(page);
}

/**
 * Subscribe to real-time data from Firestore
 */
function subscribeToData(page) {
  // Subscribe to categories
  unsubscribeCategories = CategoryService.subscribe((categories) => {
    allCategories = categories;
    if (filterBarInstance) filterBarInstance.setCategories(categories.map(c => c.name));
  });

  // Subscribe to products
  unsubscribeProducts = ProductService.subscribe((products) => {
    allProducts = products;
  });

  // Subscribe to suppliers
  unsubscribeSuppliers = SupplierService.subscribe((suppliers) => {
    allSuppliers = suppliers;
  });

  // Subscribe to purchases
  unsubscribePurchases = PurchaseService.subscribe((purchases) => {
    allPurchases = purchases;
    if (filterBarInstance) {
      applyFilters(filterBarInstance.getFilters());
    } else {
      updateTable(purchases);
    }
    updateSummary(purchases, page);
  });
}

/**
 * Apply filters to the purchase data
 */
function applyFilters(filters) {
  let filtered = [...allPurchases];

  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom);
    from.setHours(0, 0, 0, 0);
    filtered = filtered.filter(p => {
      const d = p.date instanceof Date ? p.date : new Date(p.date);
      return d >= from;
    });
  }

  if (filters.dateTo) {
    const to = new Date(filters.dateTo);
    to.setHours(23, 59, 59, 999);
    filtered = filtered.filter(p => {
      const d = p.date instanceof Date ? p.date : new Date(p.date);
      return d <= to;
    });
  }

  if (filters.category && filters.category !== 'All') {
    filtered = filtered.filter(p => p.category === filters.category);
  }

  if (filters.status && filters.status !== 'All') {
    filtered = filtered.filter(p => p.status === filters.status);
  }

  if (filters.search) {
    const query = filters.search.toLowerCase();
    filtered = filtered.filter(p =>
      (p.productName || '').toLowerCase().includes(query) ||
      (p.supplierName || '').toLowerCase().includes(query) ||
      (p.id || '').toLowerCase().includes(query) ||
      (p.category || '').toLowerCase().includes(query) ||
      (p.notes || '').toLowerCase().includes(query)
    );
  }

  updateTable(filtered);
}

/**
 * Update the table with filtered data
 */
function updateTable(data) {
  if (tableInstance) {
    tableInstance.setData(data);
    tableInstance.setLoading(false);
  }
}

/**
 * Update summary strip
 */
function updateSummary(purchases, page) {
  const totalRecords = page.querySelector('#summaryTotalRecords');
  const totalValue = page.querySelector('#summaryTotalValue');
  const pending = page.querySelector('#summaryPending');
  const delivered = page.querySelector('#summaryDelivered');
  const count = page.querySelector('#purchaseCount');

  if (totalRecords) totalRecords.textContent = purchases.length;
  if (totalValue) totalValue.textContent = formatCurrency(purchases.reduce((sum, p) => sum + (p.totalPurchaseCost || 0), 0));
  if (pending) pending.textContent = purchases.filter(p => p.status === 'Pending').length;
  if (delivered) delivered.textContent = purchases.filter(p => p.status === 'Delivered').length;
  if (count) count.textContent = `${purchases.length} records`;
}

/**
 * Opens the purchase form modal for add/edit
 */
function openPurchaseForm(existingData) {
  const isEdit = !!existingData;

  // Build product options
  const productOptions = [
    { value: '', label: '— Select Product —' },
    ...allProducts.map(p => ({ value: p.id, label: `${p.id} — ${p.productName}` })),
  ];

  // Build supplier options
  const supplierOptions = [
    { value: '', label: '— Select Supplier —' },
    ...allSuppliers.map(s => ({ value: s.id, label: `${s.id} — ${s.name}` })),
  ];

  // Build category options
  const categoryOptions = [
    { value: '', label: '— Select Category —' },
    ...allCategories.map(c => ({ value: c.name, label: c.name })),
  ];

  // Status options
  const statusOptions = ORDER_STATUSES.map(s => ({ value: s, label: s }));

  const fields = [
    { key: 'date', label: 'Date', type: 'date', required: true, value: existingData?.date ? formatDateForInput(existingData.date) : formatDateForInput(new Date()) },
    { key: 'category', label: 'Category', type: 'select', required: true, options: categoryOptions, value: existingData?.category || '' },
    { key: 'productId', label: 'Product', type: 'select', required: true, options: productOptions, value: existingData?.productId || '' },
    { key: 'productName', label: 'Product Name', type: 'text', readOnly: true, value: existingData?.productName || '', placeholder: 'Auto-filled from product selection' },
    { key: 'productUse', label: 'Product Use', type: 'text', readOnly: true, value: existingData?.productUse || '', placeholder: 'Auto-filled from product selection' },
    { key: 'supplierId', label: 'Supplier', type: 'select', required: true, options: supplierOptions, value: existingData?.supplierId || '' },
    { key: 'supplierName', label: 'Supplier Name', type: 'text', readOnly: true, value: existingData?.supplierName || '', placeholder: 'Auto-filled from supplier selection' },
    { key: 'supplierLocation', label: 'Supplier Location', type: 'text', readOnly: true, value: existingData?.supplierLocation || '' },
    { key: 'supplierContact', label: 'Supplier Contact', type: 'text', readOnly: true, value: existingData?.supplierContact || '' },
    { key: 'quantity', label: 'Quantity (pieces)', type: 'number', required: true, value: existingData?.quantity || '', step: '1', placeholder: '0' },
    { key: 'buyingCostPerUnit', label: 'Buying Cost per Unit (₹)', type: 'number', required: true, value: existingData?.buyingCostPerUnit || '', step: '0.01', placeholder: '0.00' },
    { key: 'buyingTransportCost', label: 'Transport Cost (₹)', type: 'number', value: existingData?.buyingTransportCost || 0, step: '0.01', placeholder: '0.00' },
    { key: 'totalPurchaseCost', label: 'Total Purchase Cost (₹)', type: 'number', readOnly: true, value: existingData?.totalPurchaseCost || 0, placeholder: 'Auto-calculated' },
    { key: 'status', label: 'Status', type: 'select', required: true, options: statusOptions, value: existingData?.status || 'Pending' },
    { key: 'notes', label: 'Notes', type: 'textarea', value: existingData?.notes || '', placeholder: 'Additional comments...' },
  ];

  const modal = openModal({
    title: isEdit ? `Edit Purchase — ${existingData.id}` : 'New Purchase',
    fields,
    data: existingData,
    computeFields: [
      {
        target: 'totalPurchaseCost',
        formula: (fd) => {
          const qty = parseFloat(fd.quantity) || 0;
          const cost = parseFloat(fd.buyingCostPerUnit) || 0;
          const transport = parseFloat(fd.buyingTransportCost) || 0;
          return qty * cost + transport;
        },
      },
    ],
    onFieldChange: (key, value, formData, setFieldValue) => {
      // Auto-fill product details
      if (key === 'productId' && value) {
        const product = allProducts.find(p => p.id === value);
        if (product) {
          setFieldValue('productName', product.productName);
          setFieldValue('productUse', product.productUse || '');
          setFieldValue('category', product.category || formData.category);
        }
      }
      // Auto-fill supplier details
      if (key === 'supplierId' && value) {
        const supplier = allSuppliers.find(s => s.id === value);
        if (supplier) {
          setFieldValue('supplierName', supplier.name);
          setFieldValue('supplierLocation', supplier.location || '');
          setFieldValue('supplierContact', supplier.contact || '');
        }
      }
    },
    onSave: async (formData) => {
      try {
        // Recalculate total
        formData.totalPurchaseCost = (parseFloat(formData.quantity) || 0) * (parseFloat(formData.buyingCostPerUnit) || 0) + (parseFloat(formData.buyingTransportCost) || 0);
        formData.quantity = parseInt(formData.quantity) || 0;
        formData.buyingCostPerUnit = parseFloat(formData.buyingCostPerUnit) || 0;
        formData.buyingTransportCost = parseFloat(formData.buyingTransportCost) || 0;

        if (isEdit) {
          await PurchaseService.update(existingData.id, formData);
          showToast(`Purchase ${existingData.id} updated successfully`, 'success');
        } else {
          const result = await PurchaseService.add(formData);
          showToast(`Purchase ${result.id} created successfully`, 'success');
        }
        return { success: true };
      } catch (err) {
        console.error('Save purchase error:', err);
        showToast(`Failed to save purchase: ${err.message}`, 'error');
        return { success: false, error: err.message };
      }
    },
    onCancel: () => {},
  });
}

/**
 * Confirm and delete a purchase record
 */
async function confirmDelete(row) {
  if (confirm(`Are you sure you want to delete purchase ${row.id}?\n\nProduct: ${row.productName}\nSupplier: ${row.supplierName}\nTotal: ${formatCurrency(row.totalPurchaseCost)}\n\nThis action cannot be undone.`)) {
    try {
      await PurchaseService.remove(row.id);
      showToast(`Purchase ${row.id} deleted successfully`, 'success');
    } catch (err) {
      showToast(`Failed to delete: ${err.message}`, 'error');
    }
  }
}

/**
 * Export data to CSV or Excel
 */
function exportData(format) {
  const data = tableInstance ? tableInstance.getCurrentData() : allPurchases;
  const exportColumns = [
    { key: 'date', label: 'Date', format: 'date' },
    { key: 'id', label: 'Purchase ID' },
    { key: 'category', label: 'Category' },
    { key: 'productId', label: 'Product ID' },
    { key: 'productName', label: 'Product Name' },
    { key: 'productUse', label: 'Product Use' },
    { key: 'supplierId', label: 'Supplier ID' },
    { key: 'supplierName', label: 'Supplier Name' },
    { key: 'supplierLocation', label: 'Supplier Location' },
    { key: 'supplierContact', label: 'Supplier Contact' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'buyingCostPerUnit', label: 'Cost per Unit', format: 'currency' },
    { key: 'buyingTransportCost', label: 'Transport Cost', format: 'currency' },
    { key: 'totalPurchaseCost', label: 'Total Cost', format: 'currency' },
    { key: 'status', label: 'Status' },
    { key: 'notes', label: 'Notes' },
  ];

  if (format === 'csv') {
    exportToCSV(data, exportColumns, 'UV_Purchases');
  } else {
    exportToExcel(data, exportColumns, 'UV_Purchases');
  }
  showToast(`Purchases exported to ${format.toUpperCase()}`, 'success');
}

/**
 * Format a date for HTML date input (YYYY-MM-DD)
 */
function formatDateForInput(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

/**
 * Cleanup all listeners and instances
 */
export function cleanup() {
  if (unsubscribePurchases) { unsubscribePurchases(); unsubscribePurchases = null; }
  if (unsubscribeProducts) { unsubscribeProducts(); unsubscribeProducts = null; }
  if (unsubscribeSuppliers) { unsubscribeSuppliers(); unsubscribeSuppliers = null; }
  if (unsubscribeCategories) { unsubscribeCategories(); unsubscribeCategories = null; }
  if (tableInstance) { tableInstance.destroy(); tableInstance = null; }
  if (filterBarInstance) { filterBarInstance.destroy(); filterBarInstance = null; }
  allPurchases = [];
}
