/**
 * Selling Page — Sales transaction management with full CRUD, filtering, stock validation, and real-time sync
 * @module pages/selling
 */

import { createDataTable } from '../components/data-table.js';
import { createFilterBar } from '../components/filters.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { SaleService } from '../services/sale.service.js';
import { ProductService } from '../services/product.service.js';
import { BuyerService } from '../services/buyer.service.js';
import { CategoryService } from '../services/category.service.js';
import { InventoryService } from '../services/inventory.service.js';
import { formatCurrency } from '../utils/helpers.js';
import { exportToExcel, exportToCSV } from '../utils/export.js';
import { ORDER_STATUSES } from '../utils/constants.js';

let unsubscribeSales = null;
let unsubscribeProducts = null;
let unsubscribeBuyers = null;
let unsubscribeCategories = null;
let unsubscribeInventory = null;

let tableInstance = null;
let filterBarInstance = null;
let allSales = [];
let allProducts = [];
let allBuyers = [];
let allCategories = [];
let inventoryData = {};

/**
 * Renders the selling sheet page
 * @param {HTMLElement} container - Content area
 */
export function renderSellingPage(container) {
  cleanup();
  container.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'page-selling';

  // Page Header
  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `
    <div class="page-header-left">
      <h1 class="page-title">Sales</h1>
      <span class="page-subtitle" id="saleCount">Loading...</span>
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
      <button class="btn btn-primary" id="addSaleBtn">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Sale
      </button>
    </div>
  `;
  page.appendChild(header);

  // Summary Strip
  const summary = document.createElement('div');
  summary.className = 'transaction-summary glass-card';
  summary.innerHTML = `
    <div class="summary-item">
      <span class="summary-label">Total Records</span>
      <span class="summary-value" id="summaryTotalRecords">0</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Total Sales Value</span>
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

  // Table
  const tableContainer = document.createElement('div');
  tableContainer.className = 'table-section';
  page.appendChild(tableContainer);

  const columns = [
    { key: 'date', label: 'Date', type: 'date', sortable: true, width: '100px' },
    { key: 'id', label: 'Sale ID', type: 'text', sortable: true, width: '100px' },
    { key: 'category', label: 'Category', type: 'text', sortable: true, width: '110px' },
    { key: 'productName', label: 'Product', type: 'text', sortable: true },
    { key: 'productUse', label: 'Use', type: 'text', width: '100px' },
    { key: 'buyerName', label: 'Buyer', type: 'text', sortable: true },
    { key: 'buyerLocation', label: 'Location', type: 'text', width: '110px' },
    { key: 'quantity', label: 'Qty', type: 'number', sortable: true, width: '70px', align: 'right' },
    { key: 'sellingPricePerUnit', label: 'Price/Unit', type: 'currency', sortable: true, width: '100px', align: 'right' },
    { key: 'sellingTransportCost', label: 'Transport', type: 'currency', width: '100px', align: 'right' },
    { key: 'totalSellingPrice', label: 'Total Price', type: 'currency', sortable: true, width: '110px', align: 'right' },
    { key: 'status', label: 'Status', type: 'status', sortable: true, width: '110px' },
    { key: '_actions', label: '', type: 'actions', width: '80px' },
  ];

  tableInstance = createDataTable(tableContainer, {
    columns,
    data: [],
    pageSize: 25,
    onRowClick: (row) => openSaleForm(row),
    onEdit: (row) => openSaleForm(row),
    onDelete: (row) => confirmDelete(row),
    emptyMessage: 'No sales recorded yet',
    emptyIcon: `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  });

  container.appendChild(page);

  // Event listeners
  page.querySelector('#addSaleBtn').addEventListener('click', () => openSaleForm(null));
  page.querySelector('#exportCSVBtn').addEventListener('click', () => exportData('csv'));
  page.querySelector('#exportExcelBtn').addEventListener('click', () => exportData('excel'));

  // Load data
  subscribeToData(page);
}

function subscribeToData(page) {
  unsubscribeCategories = CategoryService.subscribe((categories) => {
    allCategories = categories;
    if (filterBarInstance) filterBarInstance.setCategories(categories.map(c => c.name));
  });

  unsubscribeProducts = ProductService.subscribe((products) => {
    allProducts = products;
  });

  unsubscribeBuyers = BuyerService.subscribe((buyers) => {
    allBuyers = buyers;
  });

  unsubscribeSales = SaleService.subscribe((sales) => {
    allSales = sales;
    if (filterBarInstance) {
      applyFilters(filterBarInstance.getFilters());
    } else {
      updateTable(sales);
    }
    updateSummary(sales, page);
  });

  // Subscribe to inventory for real-time stock data
  unsubscribeInventory = InventoryService.subscribe((inventory) => {
    inventoryData = {};
    inventory.forEach(item => {
      inventoryData[item.productId] = item.balanceStock;
    });
  });
}

function applyFilters(filters) {
  let filtered = [...allSales];

  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom);
    from.setHours(0, 0, 0, 0);
    filtered = filtered.filter(s => {
      const d = s.date instanceof Date ? s.date : new Date(s.date);
      return d >= from;
    });
  }

  if (filters.dateTo) {
    const to = new Date(filters.dateTo);
    to.setHours(23, 59, 59, 999);
    filtered = filtered.filter(s => {
      const d = s.date instanceof Date ? s.date : new Date(s.date);
      return d <= to;
    });
  }

  if (filters.category && filters.category !== 'All') {
    filtered = filtered.filter(s => s.category === filters.category);
  }

  if (filters.status && filters.status !== 'All') {
    filtered = filtered.filter(s => s.status === filters.status);
  }

  if (filters.search) {
    const query = filters.search.toLowerCase();
    filtered = filtered.filter(s =>
      (s.productName || '').toLowerCase().includes(query) ||
      (s.buyerName || '').toLowerCase().includes(query) ||
      (s.id || '').toLowerCase().includes(query) ||
      (s.category || '').toLowerCase().includes(query) ||
      (s.notes || '').toLowerCase().includes(query)
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

function updateSummary(sales, page) {
  const totalRecords = page.querySelector('#summaryTotalRecords');
  const totalValue = page.querySelector('#summaryTotalValue');
  const pending = page.querySelector('#summaryPending');
  const delivered = page.querySelector('#summaryDelivered');
  const count = page.querySelector('#saleCount');

  if (totalRecords) totalRecords.textContent = sales.length;
  if (totalValue) totalValue.textContent = formatCurrency(sales.reduce((sum, s) => sum + (s.totalSellingPrice || s.totalSellingAmount || 0), 0));
  if (pending) pending.textContent = sales.filter(s => s.status === 'Pending').length;
  if (delivered) delivered.textContent = sales.filter(s => s.status === 'Delivered').length;
  if (count) count.textContent = `${sales.length} records`;
}

function openSaleForm(existingData) {
  const isEdit = !!existingData;

  const productOptions = [
    { value: '', label: '— Select Product —' },
    ...allProducts.map(p => {
      const stock = inventoryData[p.id] || 0;
      return { value: p.id, label: `${p.id} — ${p.productName} (Stock: ${stock})` };
    }),
  ];

  const buyerOptions = [
    { value: '', label: '— Select Buyer —' },
    ...allBuyers.map(b => ({ value: b.id, label: `${b.id} — ${b.name}` })),
  ];

  const categoryOptions = [
    { value: '', label: '— Select Category —' },
    ...allCategories.map(c => ({ value: c.name, label: c.name })),
  ];

  const statusOptions = ORDER_STATUSES.map(s => ({ value: s, label: s }));

  const fields = [
    { key: 'date', label: 'Date', type: 'date', required: true, value: existingData?.date ? formatDateForInput(existingData.date) : formatDateForInput(new Date()) },
    { key: 'category', label: 'Category', type: 'select', required: true, options: categoryOptions, value: existingData?.category || '' },
    { key: 'productId', label: 'Product', type: 'select', required: true, options: productOptions, value: existingData?.productId || '' },
    { key: 'productName', label: 'Product Name', type: 'text', readOnly: true, value: existingData?.productName || '', placeholder: 'Auto-filled' },
    { key: 'productUse', label: 'Product Use', type: 'text', readOnly: true, value: existingData?.productUse || '', placeholder: 'Auto-filled' },
    { key: 'buyerId', label: 'Buyer', type: 'select', required: true, options: buyerOptions, value: existingData?.buyerId || '' },
    { key: 'buyerName', label: 'Buyer Name', type: 'text', readOnly: true, value: existingData?.buyerName || '', placeholder: 'Auto-filled' },
    { key: 'buyerLocation', label: 'Buyer Location', type: 'text', readOnly: true, value: existingData?.buyerLocation || '' },
    { key: 'buyerContact', label: 'Buyer Contact', type: 'text', readOnly: true, value: existingData?.buyerContact || '' },
    { key: 'quantity', label: 'Quantity (pieces)', type: 'number', required: true, value: existingData?.quantity || '', step: '1', placeholder: '0' },
    { key: 'sellingPricePerUnit', label: 'Selling Price per Unit (₹)', type: 'number', required: true, value: existingData?.sellingPricePerUnit || '', step: '0.01', placeholder: '0.00' },
    { key: 'sellingTransportCost', label: 'Transport Cost (₹)', type: 'number', value: existingData?.sellingTransportCost || 0, step: '0.01', placeholder: '0.00' },
    { key: 'totalSellingPrice', label: 'Total Selling Price (₹)', type: 'number', readOnly: true, value: existingData?.totalSellingPrice || 0, placeholder: 'Auto-calculated' },
    { key: 'status', label: 'Status', type: 'select', required: true, options: statusOptions, value: existingData?.status || 'Pending' },
    { key: 'notes', label: 'Notes', type: 'textarea', value: existingData?.notes || '', placeholder: 'Additional comments...' },
  ];

  openModal({
    title: isEdit ? `Edit Sale — ${existingData.id}` : 'New Sale',
    fields,
    data: existingData,
    computeFields: [
      {
        target: 'totalSellingPrice',
        formula: (fd) => {
          const qty = parseFloat(fd.quantity) || 0;
          const price = parseFloat(fd.sellingPricePerUnit) || 0;
          const transport = parseFloat(fd.sellingTransportCost) || 0;
          return qty * price + transport;
        },
      },
    ],
    onFieldChange: (key, value, formData, setFieldValue) => {
      if (key === 'productId' && value) {
        const product = allProducts.find(p => p.id === value);
        if (product) {
          setFieldValue('productName', product.productName);
          setFieldValue('productUse', product.productUse || '');
          setFieldValue('category', product.category || formData.category);
        }
      }
      if (key === 'buyerId' && value) {
        const buyer = allBuyers.find(b => b.id === value);
        if (buyer) {
          setFieldValue('buyerName', buyer.name);
          setFieldValue('buyerLocation', buyer.location || '');
          setFieldValue('buyerContact', buyer.contact || '');
        }
      }
      // Stock validation warning
      if (key === 'quantity' && formData.productId) {
        const stock = inventoryData[formData.productId] || 0;
        const qty = parseInt(value) || 0;
        if (qty > stock) {
          showToast(`⚠️ Warning: Only ${stock} pieces in stock for this product`, 'warning', 5000);
        }
      }
    },
    onSave: async (formData) => {
      try {
        formData.totalSellingPrice = (parseFloat(formData.quantity) || 0) * (parseFloat(formData.sellingPricePerUnit) || 0) + (parseFloat(formData.sellingTransportCost) || 0);
        formData.quantity = parseInt(formData.quantity) || 0;
        formData.sellingPricePerUnit = parseFloat(formData.sellingPricePerUnit) || 0;
        formData.sellingTransportCost = parseFloat(formData.sellingTransportCost) || 0;

        // Stock check for new sales or increased quantity
        if (!isEdit || formData.quantity > (existingData?.quantity || 0)) {
          const stock = inventoryData[formData.productId] || 0;
          const additionalQty = isEdit ? formData.quantity - (existingData?.quantity || 0) : formData.quantity;
          if (additionalQty > stock) {
            showToast(`⚠️ Warning: Selling ${additionalQty} pieces but only ${stock} in stock. Proceeding anyway.`, 'warning', 6000);
          }
        }

        if (isEdit) {
          await SaleService.update(existingData.id, formData);
          showToast(`Sale ${existingData.id} updated successfully`, 'success');
        } else {
          const result = await SaleService.add(formData);
          showToast(`Sale ${result.id} created successfully`, 'success');
        }

        return { success: true };
      } catch (err) {
        console.error('Save sale error:', err);
        showToast(`Failed to save sale: ${err.message}`, 'error');
        return { success: false, error: err.message };
      }
    },
    onCancel: () => {},
  });
}

async function confirmDelete(row) {
  if (confirm(`Are you sure you want to delete sale ${row.id}?\n\nProduct: ${row.productName}\nBuyer: ${row.buyerName}\nTotal: ${formatCurrency(row.totalSellingPrice)}\n\nThis action cannot be undone.`)) {
    try {
      await SaleService.remove(row.id);
      showToast(`Sale ${row.id} deleted successfully`, 'success');
    } catch (err) {
      showToast(`Failed to delete: ${err.message}`, 'error');
    }
  }
}

function exportData(format) {
  const data = tableInstance ? tableInstance.getCurrentData() : allSales;
  const exportColumns = [
    { key: 'date', label: 'Date', format: 'date' },
    { key: 'id', label: 'Sale ID' },
    { key: 'category', label: 'Category' },
    { key: 'productId', label: 'Product ID' },
    { key: 'productName', label: 'Product Name' },
    { key: 'productUse', label: 'Product Use' },
    { key: 'buyerId', label: 'Buyer ID' },
    { key: 'buyerName', label: 'Buyer Name' },
    { key: 'buyerLocation', label: 'Buyer Location' },
    { key: 'buyerContact', label: 'Buyer Contact' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'sellingPricePerUnit', label: 'Price per Unit', format: 'currency' },
    { key: 'sellingTransportCost', label: 'Transport Cost', format: 'currency' },
    { key: 'totalSellingPrice', label: 'Total Price', format: 'currency' },
    { key: 'status', label: 'Status' },
    { key: 'notes', label: 'Notes' },
  ];

  if (format === 'csv') {
    exportToCSV(data, exportColumns, 'UV_Sales');
  } else {
    exportToExcel(data, exportColumns, 'UV_Sales');
  }
  showToast(`Sales exported to ${format.toUpperCase()}`, 'success');
}

function formatDateForInput(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

export function cleanup() {
  if (unsubscribeSales) { unsubscribeSales(); unsubscribeSales = null; }
  if (unsubscribeProducts) { unsubscribeProducts(); unsubscribeProducts = null; }
  if (unsubscribeBuyers) { unsubscribeBuyers(); unsubscribeBuyers = null; }
  if (unsubscribeCategories) { unsubscribeCategories(); unsubscribeCategories = null; }
  if (unsubscribeInventory) { unsubscribeInventory(); unsubscribeInventory = null; }
  if (tableInstance) { tableInstance.destroy(); tableInstance = null; }
  if (filterBarInstance) { filterBarInstance.destroy(); filterBarInstance = null; }
  allSales = [];
  inventoryData = {};
}
