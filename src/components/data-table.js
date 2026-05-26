/**
 * @module data-table
 * @description Enterprise-grade data table with configurable columns, client-side
 * sorting, pagination, row selection, status badges, Indian currency formatting,
 * loading skeletons, and empty-state support.
 */

/** Indian currency formatter — ₹12,45,678 */
const currencyFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** Number formatter (Indian grouping) */
const numberFmt = new Intl.NumberFormat('en-IN');

/**
 * Format a date value to DD/MM/YYYY.
 * @param {string|number|Date} value
 * @returns {string}
 */
function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Inline SVG helpers for small action icons.
 * @type {Record<string, string>}
 */
const tableIcons = {
  edit: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`,
  delete: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
  sortAsc: '▲',
  sortDesc: '▼',
  sortNone: '⇅',
};

/**
 * Normalise a status string into a CSS class suffix.
 * e.g. "In Transit" → "in-transit"
 * @param {string} status
 * @returns {string}
 */
function statusClass(status) {
  return String(status || '')
    .toLowerCase()
    .replace(/\s+/g, '-');
}

/**
 * Creates a data table component.
 *
 * @param {HTMLElement} container - Parent DOM element.
 * @param {Object} opts
 * @param {Array<{key:string, label:string, type?:string, width?:string, sortable?:boolean, align?:string}>} opts.columns
 * @param {Array<Object>} [opts.data=[]]
 * @param {number} [opts.pageSize=25]
 * @param {function(Object):void} [opts.onRowClick]
 * @param {function(Object):void} [opts.onEdit]
 * @param {function(Object):void} [opts.onDelete]
 * @param {function(Array<Object>):void} [opts.onSelectionChange]
 * @param {string} [opts.emptyMessage='No records found']
 * @param {string} [opts.emptyIcon]
 * @returns {{ setData, setLoading, getSelectedRows, clearSelection, getCurrentData, destroy }}
 */
export function createDataTable(container, opts = {}) {
  const {
    columns = [],
    data: initialData = [],
    pageSize: defaultPageSize = 25,
    onRowClick,
    onEdit,
    onDelete,
    onSelectionChange,
    emptyMessage = 'No records found',
    emptyIcon,
    selectable = true,
    bulkActions = [],
  } = opts;

  // ── Internal state ──
  let allData = [...initialData];
  let sortKey = null;
  let sortDir = 'none'; // 'asc' | 'desc' | 'none'
  let currentPage = 1;
  let pageSize = defaultPageSize;
  let selectedIds = new Set(); // indices
  let isLoading = false;

  // ── DOM scaffold ──
  const wrapper = document.createElement('div');
  wrapper.className = 'data-table-wrapper';

  const tableContainer = document.createElement('div');
  tableContainer.className = 'data-table-scroll';

  const table = document.createElement('table');
  table.className = 'table data-table';

  const thead = document.createElement('thead');
  const theadRow = document.createElement('tr');
  thead.appendChild(theadRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  table.appendChild(tbody);

  tableContainer.appendChild(table);
  wrapper.appendChild(tableContainer);

  // Pagination footer
  const footer = document.createElement('div');
  footer.className = 'data-table-footer';
  wrapper.appendChild(footer);

  container.innerHTML = '';
  container.appendChild(wrapper);

  // Bulk actions floating bar
  const bulkBar = document.createElement('div');
  bulkBar.className = 'bulk-actions-bar';
  wrapper.appendChild(bulkBar);

  function updateBulkBar() {
    if (!bulkActions || bulkActions.length === 0) return;
    const selectedCount = selectedIds.size;
    
    if (selectedCount > 0) {
      bulkBar.classList.add('bulk-actions-bar--visible');
      bulkBar.innerHTML = \`
        <div class="bulk-actions-info">
          <span class="bulk-count">\${selectedCount}</span> selected
        </div>
        <div class="bulk-actions-buttons">
          <button class="btn btn-ghost btn-sm" id="bulk-clear">Clear Selection</button>
        </div>
      \`;
      
      const btnContainer = bulkBar.querySelector('.bulk-actions-buttons');
      
      bulkActions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = \`btn btn-sm \${action.class || 'btn-primary'}\`;
        btn.innerHTML = action.icon ? \`\${action.icon} \${action.label}\` : action.label;
        btn.addEventListener('click', () => {
          action.onClick(getSelectedRows());
        });
        btnContainer.prepend(btn);
      });
      
      bulkBar.querySelector('#bulk-clear').addEventListener('click', () => clearSelection());
    } else {
      bulkBar.classList.remove('bulk-actions-bar--visible');
    }
  }

  // ── Render header ──
  function renderHeader() {
    theadRow.innerHTML = '';

    // Checkbox column
    if (selectable) {
      const thCheck = document.createElement('th');
      thCheck.className = 'col-checkbox';
      thCheck.style.width = '40px';
      const selectAllCb = document.createElement('input');
      selectAllCb.type = 'checkbox';
      selectAllCb.className = 'table-checkbox';
      selectAllCb.title = 'Select all';
      selectAllCb.addEventListener('change', () => {
        const visible = getVisibleData();
        if (selectAllCb.checked) {
          visible.forEach((_, i) => selectedIds.add(pageOffset() + i));
        } else {
          visible.forEach((_, i) => selectedIds.delete(pageOffset() + i));
        }
        renderBody();
        fireSelectionChange();
        updateBulkBar();
      });
      thCheck.appendChild(selectAllCb);
      theadRow.appendChild(thCheck);
    }

    columns.forEach((col) => {
      const th = document.createElement('th');
      th.textContent = col.label;
      if (col.width) th.style.width = col.width;
      if (col.align) th.style.textAlign = col.align;
      if (col.type === 'number' || col.type === 'currency') th.style.textAlign = col.align || 'right';

      if (col.sortable !== false && col.type !== 'actions') {
        th.classList.add('sortable');
        const indicator = document.createElement('span');
        indicator.className = 'sort-indicator';
        if (sortKey === col.key) {
          indicator.textContent = sortDir === 'asc' ? tableIcons.sortAsc : tableIcons.sortDesc;
        } else {
          indicator.textContent = tableIcons.sortNone;
        }
        th.appendChild(indicator);

        th.addEventListener('click', () => {
          if (sortKey === col.key) {
            sortDir = sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? 'none' : 'asc';
            if (sortDir === 'none') sortKey = null;
          } else {
            sortKey = col.key;
            sortDir = 'asc';
          }
          currentPage = 1;
          render();
        });
      }
      theadRow.appendChild(th);
    });
  }

  // ── Sorting / pagination helpers ──
  function getSortedData() {
    if (!sortKey || sortDir === 'none') return [...allData];
    const sorted = [...allData];
    sorted.sort((a, b) => {
      let va = a[sortKey];
      let vb = b[sortKey];
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }

  function pageOffset() {
    return (currentPage - 1) * pageSize;
  }

  function getVisibleData() {
    const sorted = getSortedData();
    return sorted.slice(pageOffset(), pageOffset() + pageSize);
  }

  function totalPages() {
    return Math.max(1, Math.ceil(allData.length / pageSize));
  }

  function fireSelectionChange() {
    if (typeof onSelectionChange === 'function') {
      onSelectionChange(getSelectedRows());
    }
  }

  // ── Render body rows ──
  function renderBody() {
    tbody.innerHTML = '';

    if (isLoading) {
      for (let i = 0; i < 5; i++) {
        const tr = document.createElement('tr');
        tr.className = 'skeleton-row';
        // checkbox placeholder
        if (selectable) {
          const tdCb = document.createElement('td');
          tdCb.innerHTML = '<div class="skeleton skeleton-checkbox"></div>';
          tr.appendChild(tdCb);
        }
        columns.forEach(() => {
          const td = document.createElement('td');
          td.innerHTML = '<div class="skeleton skeleton-text"></div>';
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      }
      return;
    }

    const visible = getVisibleData();

    if (visible.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = columns.length + 1;
      td.className = 'data-table-empty';
      td.innerHTML = `
        ${emptyIcon ? `<div class="data-table-empty-icon">${emptyIcon}</div>` : ''}
        <p>${emptyMessage}</p>
      `;
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    visible.forEach((row, visIdx) => {
      const globalIdx = pageOffset() + visIdx;
      const tr = document.createElement('tr');
      tr.className = 'data-table-row';
      if (selectedIds.has(globalIdx)) tr.classList.add('row--selected');

      // Checkbox
      if (selectable) {
        const tdCb = document.createElement('td');
        tdCb.className = 'col-checkbox';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'table-checkbox';
        cb.checked = selectedIds.has(globalIdx);
        cb.addEventListener('change', (e) => {
          e.stopPropagation();
          if (cb.checked) {
            selectedIds.add(globalIdx);
          } else {
            selectedIds.delete(globalIdx);
          }
          tr.classList.toggle('row--selected', cb.checked);
          fireSelectionChange();
          updateSelectAll();
          updateBulkBar();
        });
        tdCb.addEventListener('click', (e) => e.stopPropagation());
        tdCb.appendChild(cb);
        tr.appendChild(tdCb);
      }

      // Data cells
      columns.forEach((col) => {
        const td = document.createElement('td');
        const value = row[col.key];

        switch (col.type) {
          case 'currency':
            td.style.textAlign = col.align || 'right';
            td.textContent = value != null ? currencyFmt.format(value) : '—';
            break;
          case 'number':
            td.style.textAlign = col.align || 'right';
            td.textContent = value != null ? numberFmt.format(value) : '—';
            break;
          case 'date':
            td.textContent = formatDate(value);
            break;
          case 'status': {
            const badge = document.createElement('span');
            badge.className = `badge badge-${statusClass(value)}`;
            badge.textContent = value || '—';
            td.appendChild(badge);
            break;
          }
          case 'actions': {
            td.className = 'col-actions';
            if (typeof onEdit === 'function') {
              const editBtn = document.createElement('button');
              editBtn.className = 'btn btn-ghost btn-icon btn-sm';
              editBtn.innerHTML = tableIcons.edit;
              editBtn.title = 'Edit';
              editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                onEdit(row);
              });
              td.appendChild(editBtn);
            }
            if (typeof onDelete === 'function') {
              const delBtn = document.createElement('button');
              delBtn.className = 'btn btn-ghost btn-icon btn-sm btn-danger-ghost';
              delBtn.innerHTML = tableIcons.delete;
              delBtn.title = 'Delete';
              delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                onDelete(row);
              });
              td.appendChild(delBtn);
            }
            break;
          }
          default:
            if (col.align) td.style.textAlign = col.align;
            td.textContent = value != null ? String(value) : '—';
        }

        tr.appendChild(td);
      });

      if (typeof onRowClick === 'function') {
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', () => onRowClick(row));
      }

      tbody.appendChild(tr);
    });
  }

  function updateSelectAll() {
    const selectAllCb = theadRow.querySelector('.table-checkbox');
    if (!selectAllCb) return;
    const visible = getVisibleData();
    const allChecked = visible.length > 0 && visible.every((_, i) => selectedIds.has(pageOffset() + i));
    const someChecked = visible.some((_, i) => selectedIds.has(pageOffset() + i));
    selectAllCb.checked = allChecked;
    selectAllCb.indeterminate = someChecked && !allChecked;
  }

  // ── Render pagination footer ──
  function renderFooter() {
    footer.innerHTML = '';

    if (isLoading || allData.length === 0) return;

    const total = allData.length;
    const pages = totalPages();
    const start = pageOffset() + 1;
    const end = Math.min(pageOffset() + pageSize, total);

    // Info
    const info = document.createElement('span');
    info.className = 'data-table-info';
    info.textContent = `Showing ${start}–${end} of ${total}`;
    footer.appendChild(info);

    // Page size selector
    const sizeWrap = document.createElement('div');
    sizeWrap.className = 'data-table-page-size';
    const sizeLabel = document.createElement('span');
    sizeLabel.textContent = 'Rows: ';
    const sizeSelect = document.createElement('select');
    sizeSelect.className = 'select select-sm';
    [25, 50, 100].forEach((s) => {
      const o = document.createElement('option');
      o.value = s;
      o.textContent = s;
      if (s === pageSize) o.selected = true;
      sizeSelect.appendChild(o);
    });
    sizeSelect.addEventListener('change', () => {
      pageSize = parseInt(sizeSelect.value, 10);
      currentPage = 1;
      render();
    });
    sizeWrap.appendChild(sizeLabel);
    sizeWrap.appendChild(sizeSelect);
    footer.appendChild(sizeWrap);

    // Pagination buttons
    const pag = document.createElement('div');
    pag.className = 'data-table-pagination';

    const btnFirst = createPageBtn('«', 1, currentPage === 1);
    const btnPrev = createPageBtn('‹', currentPage - 1, currentPage === 1);
    const pageInfo = document.createElement('span');
    pageInfo.className = 'page-info';
    pageInfo.textContent = `Page ${currentPage} of ${pages}`;
    const btnNext = createPageBtn('›', currentPage + 1, currentPage === pages);
    const btnLast = createPageBtn('»', pages, currentPage === pages);

    pag.appendChild(btnFirst);
    pag.appendChild(btnPrev);
    pag.appendChild(pageInfo);
    pag.appendChild(btnNext);
    pag.appendChild(btnLast);

    footer.appendChild(pag);
  }

  function createPageBtn(text, page, disabled) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-ghost btn-sm';
    btn.textContent = text;
    btn.disabled = disabled;
    btn.addEventListener('click', () => {
      currentPage = page;
      render();
    });
    return btn;
  }

  // ── Full render ──
  function render() {
    renderHeader();
    renderBody();
    renderFooter();
    updateSelectAll();
    updateBulkBar();
  }

  // Initial render
  render();

  // ── Public API ──

  /**
   * Replace the table data entirely.
   * @param {Array<Object>} newData
   */
  function setData(newData) {
    allData = Array.isArray(newData) ? [...newData] : [];
    currentPage = 1;
    selectedIds.clear();
    isLoading = false;
    render();
  }

  /**
   * Toggle loading skeleton state.
   * @param {boolean} loading
   */
  function setLoading(loading) {
    isLoading = !!loading;
    render();
  }

  /**
   * Get currently selected row objects.
   * @returns {Array<Object>}
   */
  function getSelectedRows() {
    const sorted = getSortedData();
    return [...selectedIds].filter((i) => i < sorted.length).map((i) => sorted[i]);
  }

  /** Clear all selected rows. */
  function clearSelection() {
    selectedIds.clear();
    render();
  }

  /**
   * Returns the currently visible (sorted, paginated) data slice.
   * @returns {Array<Object>}
   */
  function getCurrentData() {
    return getVisibleData();
  }

  /** Tear down the component and remove DOM. */
  function destroy() {
    wrapper.remove();
  }

  return { setData, setLoading, getSelectedRows, clearSelection, getCurrentData, destroy };
}
