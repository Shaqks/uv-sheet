/**
 * Master Data Page — Manage Products, Suppliers, Buyers, and Categories
 * @module pages/masters
 */

import { createDataTable } from '../components/data-table.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { ProductService } from '../services/product.service.js';
import { SupplierService } from '../services/supplier.service.js';
import { BuyerService } from '../services/buyer.service.js';
import { CategoryService } from '../services/category.service.js';
import { formatDate } from '../utils/helpers.js';

let activeTab = 'products';
let unsubscribes = [];
let tableInstance = null;

let allProducts = [];
let allSuppliers = [];
let allBuyers = [];
let allCategories = [];

const TABS = [
  { id: 'products', label: 'Products', icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>` },
  { id: 'suppliers', label: 'Suppliers', icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>` },
  { id: 'buyers', label: 'Buyers', icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>` },
  { id: 'categories', label: 'Categories', icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16a2 2 0 002-2V8a2 2 0 00-2-2h-7.93a2 2 0 01-1.66-.9l-.82-1.2A2 2 0 007.93 3H4a2 2 0 00-2 2v13c0 1.1.9 2 2 2z"/></svg>` },
];

/**
 * Renders the master data management page
 * @param {HTMLElement} container - Content area
 */
export function renderMastersPage(container) {
  cleanup();
  container.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'page-masters';

  // Page Header
  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `
    <div class="page-header-left">
      <h1 class="page-title">Master Data</h1>
      <span class="page-subtitle">Manage your products, suppliers, buyers, and categories</span>
    </div>
    <div class="page-header-actions">
      <button class="btn btn-primary" id="addMasterBtn">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span id="addBtnLabel">Add Product</span>
      </button>
    </div>
  `;
  page.appendChild(header);

  // Tab Navigation
  const tabs = document.createElement('div');
  tabs.className = 'masters-tabs';
  tabs.innerHTML = TABS.map(tab => `
    <button class="tab-item ${tab.id === activeTab ? 'tab-active' : ''}" data-tab="${tab.id}">
      ${tab.icon}
      <span>${tab.label}</span>
      <span class="tab-count" id="count-${tab.id}">0</span>
    </button>
  `).join('');
  page.appendChild(tabs);

  // Table Container
  const tableContainer = document.createElement('div');
  tableContainer.className = 'table-section';
  tableContainer.id = 'mastersTableContainer';
  page.appendChild(tableContainer);

  container.appendChild(page);

  // Tab click handlers
  tabs.querySelectorAll('.tab-item').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      activeTab = tabBtn.dataset.tab;
      tabs.querySelectorAll('.tab-item').forEach(t => t.classList.remove('tab-active'));
      tabBtn.classList.add('tab-active');
      page.querySelector('#addBtnLabel').textContent = `Add ${getTabLabel()}`;
      renderTable(page);
    });
  });

  // Add button
  page.querySelector('#addMasterBtn').addEventListener('click', () => openMasterForm(null));

  // Subscribe to data
  subscribeToData(page);
}

function getTabLabel() {
  return activeTab === 'products' ? 'Product'
    : activeTab === 'suppliers' ? 'Supplier'
    : activeTab === 'buyers' ? 'Buyer'
    : 'Category';
}

function subscribeToData(page) {
  const unsub1 = CategoryService.subscribe((categories) => {
    allCategories = categories;
    updateCount(page, 'categories', categories.length);
    if (activeTab === 'categories') renderTable(page);
  });

  const unsub2 = ProductService.subscribe((products) => {
    allProducts = products;
    updateCount(page, 'products', products.length);
    if (activeTab === 'products') renderTable(page);
  });

  const unsub3 = SupplierService.subscribe((suppliers) => {
    allSuppliers = suppliers;
    updateCount(page, 'suppliers', suppliers.length);
    if (activeTab === 'suppliers') renderTable(page);
  });

  const unsub4 = BuyerService.subscribe((buyers) => {
    allBuyers = buyers;
    updateCount(page, 'buyers', buyers.length);
    if (activeTab === 'buyers') renderTable(page);
  });

  unsubscribes = [unsub1, unsub2, unsub3, unsub4];
}

function updateCount(page, tabId, count) {
  const countEl = page.querySelector(`#count-${tabId}`);
  if (countEl) countEl.textContent = count;
}

function renderTable(page) {
  const container = page.querySelector('#mastersTableContainer');
  if (!container) return;

  if (tableInstance) {
    tableInstance.destroy();
    tableInstance = null;
  }

  let columns, data;

  switch (activeTab) {
    case 'products':
      columns = [
        { key: 'id', label: 'Product ID', type: 'text', sortable: true, width: '100px' },
        { key: 'productName', label: 'Product Name', type: 'text', sortable: true },
        { key: 'category', label: 'Category', type: 'text', sortable: true, width: '120px' },
        { key: 'productUse', label: 'Use', type: 'text', width: '120px' },
        { key: 'unit', label: 'Unit', type: 'text', width: '80px' },
        { key: 'reorderLevel', label: 'Reorder Level', type: 'number', width: '110px', align: 'right' },
        { key: 'warehouseLocation', label: 'Warehouse', type: 'text', width: '120px' },
        { key: 'notes', label: 'Notes', type: 'text', width: '150px' },
        { key: '_actions', label: '', type: 'actions', width: '80px' },
      ];
      data = allProducts;
      break;

    case 'suppliers':
      columns = [
        { key: 'id', label: 'Supplier ID', type: 'text', sortable: true, width: '100px' },
        { key: 'name', label: 'Supplier Name', type: 'text', sortable: true },
        { key: 'location', label: 'Location', type: 'text', sortable: true },
        { key: 'contact', label: 'Contact', type: 'text', width: '140px' },
        { key: 'notes', label: 'Notes', type: 'text', width: '200px' },
        { key: '_actions', label: '', type: 'actions', width: '80px' },
      ];
      data = allSuppliers;
      break;

    case 'buyers':
      columns = [
        { key: 'id', label: 'Buyer ID', type: 'text', sortable: true, width: '100px' },
        { key: 'name', label: 'Buyer Name', type: 'text', sortable: true },
        { key: 'location', label: 'Location', type: 'text', sortable: true },
        { key: 'contact', label: 'Contact', type: 'text', width: '140px' },
        { key: 'notes', label: 'Notes', type: 'text', width: '200px' },
        { key: '_actions', label: '', type: 'actions', width: '80px' },
      ];
      data = allBuyers;
      break;

    case 'categories':
      columns = [
        { key: 'id', label: 'ID', type: 'text', sortable: true, width: '200px' },
        { key: 'name', label: 'Category Name', type: 'text', sortable: true },
        { key: '_actions', label: '', type: 'actions', width: '80px' },
      ];
      data = allCategories;
      break;
  }

  tableInstance = createDataTable(container, {
    columns,
    data,
    pageSize: 25,
    onRowClick: (row) => openMasterForm(row),
    onEdit: (row) => openMasterForm(row),
    onDelete: (row) => confirmDelete(row),
    emptyMessage: `No ${activeTab} added yet. Click "Add ${getTabLabel()}" to get started.`,
    emptyIcon: TABS.find(t => t.id === activeTab)?.icon || '',
  });
}

function openMasterForm(existingData) {
  const isEdit = !!existingData;
  let fields, title;

  switch (activeTab) {
    case 'products':
      title = isEdit ? `Edit Product — ${existingData.id}` : 'New Product';
      fields = [
        { key: 'productName', label: 'Product Name', type: 'text', required: true, value: existingData?.productName || '', placeholder: 'e.g., Stainless Steel Sheet' },
        { key: 'category', label: 'Category', type: 'select', required: true, options: [{ value: '', label: '— Select —' }, ...allCategories.map(c => ({ value: c.name, label: c.name }))], value: existingData?.category || '' },
        { key: 'productUse', label: 'Product Use', type: 'text', value: existingData?.productUse || '', placeholder: 'e.g., Industrial coating' },
        { key: 'unit', label: 'Unit', type: 'select', options: [
          { value: 'pieces', label: 'Pieces' },
          { value: 'kg', label: 'Kilograms (kg)' },
          { value: 'liters', label: 'Liters' },
          { value: 'meters', label: 'Meters' },
          { value: 'tons', label: 'Tons' },
          { value: 'boxes', label: 'Boxes' },
          { value: 'rolls', label: 'Rolls' },
        ], value: existingData?.unit || 'pieces' },
        { key: 'reorderLevel', label: 'Reorder Level', type: 'number', value: existingData?.reorderLevel || 10, step: '1', placeholder: '10' },
        { key: 'warehouseLocation', label: 'Warehouse Location', type: 'text', value: existingData?.warehouseLocation || '', placeholder: 'e.g., Warehouse A, Rack 3' },
        { key: 'notes', label: 'Notes', type: 'textarea', value: existingData?.notes || '', placeholder: 'Additional information...' },
      ];
      break;

    case 'suppliers':
      title = isEdit ? `Edit Supplier — ${existingData.id}` : 'New Supplier';
      fields = [
        { key: 'name', label: 'Supplier Name', type: 'text', required: true, value: existingData?.name || '', placeholder: 'e.g., ABC Traders' },
        { key: 'location', label: 'Location', type: 'text', required: true, value: existingData?.location || '', placeholder: 'e.g., Mumbai, Maharashtra' },
        { key: 'contact', label: 'Contact Number', type: 'text', value: existingData?.contact || '', placeholder: '+91 98765 43210' },
        { key: 'notes', label: 'Notes', type: 'textarea', value: existingData?.notes || '', placeholder: 'Additional information...' },
      ];
      break;

    case 'buyers':
      title = isEdit ? `Edit Buyer — ${existingData.id}` : 'New Buyer';
      fields = [
        { key: 'name', label: 'Buyer Name', type: 'text', required: true, value: existingData?.name || '', placeholder: 'e.g., XYZ Corporation' },
        { key: 'location', label: 'Location', type: 'text', required: true, value: existingData?.location || '', placeholder: 'e.g., Delhi, NCR' },
        { key: 'contact', label: 'Contact Number', type: 'text', value: existingData?.contact || '', placeholder: '+91 98765 43210' },
        { key: 'notes', label: 'Notes', type: 'textarea', value: existingData?.notes || '', placeholder: 'Additional information...' },
      ];
      break;

    case 'categories':
      title = isEdit ? `Edit Category` : 'New Category';
      fields = [
        { key: 'name', label: 'Category Name', type: 'text', required: true, value: existingData?.name || '', placeholder: 'e.g., Raw Materials' },
      ];
      break;
  }

  openModal({
    title,
    fields,
    data: existingData,
    onSave: async (formData) => {
      try {
        const service = getService();
        if (isEdit) {
          await service.update(existingData.id, formData);
          showToast(`${getTabLabel()} updated successfully`, 'success');
        } else {
          const result = await service.add(formData);
          showToast(`${getTabLabel()} ${result.id || ''} created successfully`, 'success');
        }
        return { success: true };
      } catch (err) {
        console.error(`Save ${activeTab} error:`, err);
        showToast(`Failed to save: ${err.message}`, 'error');
        return { success: false, error: err.message };
      }
    },
    onCancel: () => {},
  });
}

function getService() {
  switch (activeTab) {
    case 'products': return ProductService;
    case 'suppliers': return SupplierService;
    case 'buyers': return BuyerService;
    case 'categories': return CategoryService;
  }
}

async function confirmDelete(row) {
  const label = getTabLabel();
  const name = row.productName || row.name || row.id;
  if (confirm(`Are you sure you want to delete ${label}: "${name}"?\n\nThis action cannot be undone.`)) {
    try {
      const service = getService();
      await service.remove(row.id);
      showToast(`${label} "${name}" deleted successfully`, 'success');
    } catch (err) {
      showToast(`Failed to delete: ${err.message}`, 'error');
    }
  }
}

export function cleanup() {
  unsubscribes.forEach(unsub => { if (unsub) unsub(); });
  unsubscribes = [];
  if (tableInstance) { tableInstance.destroy(); tableInstance = null; }
  allProducts = [];
  allSuppliers = [];
  allBuyers = [];
  allCategories = [];
}
