/**
 * @module filters
 * @description Filter bar with date range pickers (including FY-aware presets),
 * category and status dropdowns, debounced search input, and clear-all.
 */

/** Search icon SVG */
const searchIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;

/**
 * Formats a Date as YYYY-MM-DD for use in <input type="date">.
 * @param {Date} d
 * @returns {string}
 */
function toInputDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Compute date-range preset values.
 * Financial year in India runs April 1 → March 31.
 * @param {string} preset
 * @returns {{ from: string, to: string }}
 */
function computePreset(preset) {
  const now = new Date();
  const today = toInputDate(now);

  switch (preset) {
    case 'today':
      return { from: today, to: today };

    case 'week': {
      const day = now.getDay(); // 0=Sun
      const mon = new Date(now);
      mon.setDate(now.getDate() - ((day + 6) % 7)); // Monday
      return { from: toInputDate(mon), to: today };
    }

    case 'month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: toInputDate(first), to: today };
    }

    case 'fy': {
      // Current FY: if month >= April (3), FY starts this year, else last year
      const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const start = new Date(fyStartYear, 3, 1); // April 1
      return { from: toInputDate(start), to: today };
    }

    case 'lastfy': {
      const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const start = new Date(fyStartYear - 1, 3, 1);
      const end = new Date(fyStartYear, 2, 31); // March 31
      return { from: toInputDate(start), to: toInputDate(end) };
    }

    case 'all':
      return { from: '', to: '' };

    default:
      return { from: '', to: '' };
  }
}

/** Status options shared across the application */
const STATUS_OPTIONS = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

/**
 * Creates a filter bar component.
 *
 * @param {HTMLElement} container
 * @param {Object} opts
 * @param {boolean} [opts.showDateRange=true]
 * @param {boolean} [opts.showCategory=true]
 * @param {boolean} [opts.showStatus=true]
 * @param {boolean} [opts.showSearch=true]
 * @param {string[]} [opts.categories=[]]
 * @param {function(Object):void} opts.onChange - Called with current filter state.
 * @returns {{ getFilters, setCategories, reset, destroy }}
 */
export function createFilterBar(container, opts = {}) {
  const {
    showDateRange = true,
    showCategory = true,
    showStatus = true,
    showSearch = true,
    categories: initialCategories = [],
    onChange,
  } = opts;

  // ── State ──
  let filters = {
    dateFrom: '',
    dateTo: '',
    category: '',
    status: '',
    search: '',
  };
  let activePreset = null;
  let debounceTimer = null;
  let categories = [...initialCategories];

  // ── DOM ──
  const bar = document.createElement('div');
  bar.className = 'filter-bar';

  // ── Date range section ──
  let dateFromInput, dateToInput;
  const presetBtns = [];

  if (showDateRange) {
    const dateSection = document.createElement('div');
    dateSection.className = 'filter-section filter-dates';

    // From
    const fromGroup = document.createElement('div');
    fromGroup.className = 'filter-field';
    const fromLabel = document.createElement('label');
    fromLabel.className = 'filter-label';
    fromLabel.textContent = 'From';
    dateFromInput = document.createElement('input');
    dateFromInput.type = 'date';
    dateFromInput.className = 'input input-sm';
    dateFromInput.addEventListener('change', () => {
      filters.dateFrom = dateFromInput.value;
      activePreset = null;
      updatePresetButtons();
      fireChange();
    });
    fromGroup.appendChild(fromLabel);
    fromGroup.appendChild(dateFromInput);
    dateSection.appendChild(fromGroup);

    // To
    const toGroup = document.createElement('div');
    toGroup.className = 'filter-field';
    const toLabel = document.createElement('label');
    toLabel.className = 'filter-label';
    toLabel.textContent = 'To';
    dateToInput = document.createElement('input');
    dateToInput.type = 'date';
    dateToInput.className = 'input input-sm';
    dateToInput.addEventListener('change', () => {
      filters.dateTo = dateToInput.value;
      activePreset = null;
      updatePresetButtons();
      fireChange();
    });
    toGroup.appendChild(toLabel);
    toGroup.appendChild(dateToInput);
    dateSection.appendChild(toGroup);

    // Preset buttons
    const presets = [
      { id: 'today', label: 'Today' },
      { id: 'week', label: 'This Week' },
      { id: 'month', label: 'This Month' },
      { id: 'fy', label: 'This FY' },
      { id: 'lastfy', label: 'Last FY' },
      { id: 'all', label: 'All Time' },
    ];

    const presetBar = document.createElement('div');
    presetBar.className = 'filter-presets';

    presets.forEach((p) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-ghost btn-xs filter-preset-btn';
      btn.textContent = p.label;
      btn.dataset.preset = p.id;
      btn.addEventListener('click', () => {
        activePreset = p.id;
        const range = computePreset(p.id);
        filters.dateFrom = range.from;
        filters.dateTo = range.to;
        dateFromInput.value = range.from;
        dateToInput.value = range.to;
        updatePresetButtons();
        fireChange();
      });
      presetBtns.push(btn);
      presetBar.appendChild(btn);
    });

    dateSection.appendChild(presetBar);
    bar.appendChild(dateSection);
  }

  // ── Category dropdown ──
  let categorySelect;
  if (showCategory) {
    const catGroup = document.createElement('div');
    catGroup.className = 'filter-field';
    const catLabel = document.createElement('label');
    catLabel.className = 'filter-label';
    catLabel.textContent = 'Category';
    categorySelect = document.createElement('select');
    categorySelect.className = 'select select-sm';
    populateCategorySelect();
    categorySelect.addEventListener('change', () => {
      filters.category = categorySelect.value;
      fireChange();
    });
    catGroup.appendChild(catLabel);
    catGroup.appendChild(categorySelect);
    bar.appendChild(catGroup);
  }

  // ── Status dropdown ──
  let statusSelect;
  if (showStatus) {
    const statusGroup = document.createElement('div');
    statusGroup.className = 'filter-field';
    const statusLabel = document.createElement('label');
    statusLabel.className = 'filter-label';
    statusLabel.textContent = 'Status';
    statusSelect = document.createElement('select');
    statusSelect.className = 'select select-sm';

    const allOpt = document.createElement('option');
    allOpt.value = '';
    allOpt.textContent = 'All';
    statusSelect.appendChild(allOpt);

    STATUS_OPTIONS.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      statusSelect.appendChild(opt);
    });

    statusSelect.addEventListener('change', () => {
      filters.status = statusSelect.value;
      fireChange();
    });
    statusGroup.appendChild(statusLabel);
    statusGroup.appendChild(statusSelect);
    bar.appendChild(statusGroup);
  }

  // ── Search ──
  let searchInput;
  if (showSearch) {
    const searchGroup = document.createElement('div');
    searchGroup.className = 'filter-field filter-search';
    const searchIcon = document.createElement('span');
    searchIcon.className = 'filter-search-icon';
    searchIcon.innerHTML = searchIconSvg;
    searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'input input-sm';
    searchInput.placeholder = 'Search…';
    searchInput.addEventListener('input', () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        filters.search = searchInput.value.trim();
        fireChange();
      }, 300);
    });
    searchGroup.appendChild(searchIcon);
    searchGroup.appendChild(searchInput);
    bar.appendChild(searchGroup);
  }

  // ── Clear all ──
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'btn btn-ghost btn-sm filter-clear-btn';
  clearBtn.textContent = 'Clear All';
  clearBtn.addEventListener('click', reset);
  bar.appendChild(clearBtn);

  // Mount
  container.appendChild(bar);

  // ── Helpers ──
  function populateCategorySelect() {
    if (!categorySelect) return;
    categorySelect.innerHTML = '';
    const allOpt = document.createElement('option');
    allOpt.value = '';
    allOpt.textContent = 'All';
    categorySelect.appendChild(allOpt);
    categories.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      categorySelect.appendChild(opt);
    });
  }

  function updatePresetButtons() {
    presetBtns.forEach((btn) => {
      btn.classList.toggle('filter-preset-btn--active', btn.dataset.preset === activePreset);
    });
  }

  function fireChange() {
    if (typeof onChange === 'function') onChange({ ...filters });
  }

  // ── Public API ──

  /**
   * Returns the current filter state.
   * @returns {{ dateFrom: string, dateTo: string, category: string, status: string, search: string }}
   */
  function getFilters() {
    return { ...filters };
  }

  /**
   * Update the category dropdown options.
   * @param {string[]} newCategories
   */
  function setCategories(newCategories) {
    categories = Array.isArray(newCategories) ? [...newCategories] : [];
    populateCategorySelect();
  }

  /**
   * Reset all filters to their default (empty) state.
   */
  function reset() {
    filters = { dateFrom: '', dateTo: '', category: '', status: '', search: '' };
    activePreset = null;
    if (dateFromInput) dateFromInput.value = '';
    if (dateToInput) dateToInput.value = '';
    if (categorySelect) categorySelect.value = '';
    if (statusSelect) statusSelect.value = '';
    if (searchInput) searchInput.value = '';
    updatePresetButtons();
    fireChange();
  }

  /** Remove the filter bar from the DOM. */
  function destroy() {
    if (debounceTimer) clearTimeout(debounceTimer);
    bar.remove();
  }

  return { getFilters, setCategories, reset, destroy };
}
