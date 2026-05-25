/**
 * @module modal
 * @description Slide-in form panel from the right side with configurable fields,
 * auto-compute support, validation, and save/cancel actions.
 */

/** Close icon SVG */
const closeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

/**
 * Opens a slide-in modal form panel from the right side of the viewport.
 *
 * @param {Object} opts
 * @param {string} opts.title - Header title text.
 * @param {Array<{key:string, label:string, type?:string, required?:boolean, placeholder?:string, options?:Array<{value:string,label:string}>, readOnly?:boolean, value?:*, step?:string|number}>} opts.fields
 * @param {Object|null} [opts.data=null] - Pre-populated data for editing (keys map to field.key).
 * @param {function(Object): Promise<{success:boolean, error?:string}>} opts.onSave
 * @param {function(): void} [opts.onCancel]
 * @param {Array<{target:string, formula:function(Object):*}>} [opts.computeFields]
 * @returns {{ close: function }}
 */
export function openModal({
  title = 'Form',
  fields = [],
  data = null,
  onSave,
  onCancel,
  computeFields = [],
  onFieldChange,
  customContent,
}) {
  // ── Build form data from initial values or existing data ──
  const formData = {};
  fields.forEach((f) => {
    if (data && data[f.key] !== undefined) {
      formData[f.key] = data[f.key];
    } else if (f.value !== undefined) {
      formData[f.key] = f.value;
    } else {
      formData[f.key] = '';
    }
  });

  // ── DOM: Overlay ──
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  // ── DOM: Panel ──
  const panel = document.createElement('div');
  panel.className = 'modal-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', title);

  // Header
  const header = document.createElement('div');
  header.className = 'modal-header';

  const titleEl = document.createElement('h2');
  titleEl.className = 'modal-title';
  titleEl.textContent = title;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn btn-ghost btn-icon modal-close-btn';
  closeBtn.innerHTML = closeIcon;
  closeBtn.title = 'Close';
  closeBtn.addEventListener('click', close);

  header.appendChild(titleEl);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // Body (scrollable)
  const body = document.createElement('div');
  body.className = 'modal-body';

  const form = document.createElement('form');
  form.className = 'modal-form';
  form.setAttribute('novalidate', '');

  /** Map of key → { input, errorEl } for easy reference */
  const fieldMap = {};

  fields.forEach((field) => {
    const group = document.createElement('div');
    group.className = 'form-group';

    // Label
    const label = document.createElement('label');
    label.className = 'form-label';
    label.setAttribute('for', `modal-field-${field.key}`);
    label.textContent = field.label;
    if (field.required) {
      const req = document.createElement('span');
      req.className = 'form-required';
      req.textContent = ' *';
      label.appendChild(req);
    }
    group.appendChild(label);

    // Input element
    let input;
    const commonId = `modal-field-${field.key}`;

    switch (field.type) {
      case 'select': {
        input = document.createElement('select');
        input.className = 'select';
        // Empty option
        const emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = field.placeholder || `Select ${field.label}`;
        input.appendChild(emptyOpt);
        (field.options || []).forEach((o) => {
          const opt = document.createElement('option');
          opt.value = o.value;
          opt.textContent = o.label;
          input.appendChild(opt);
        });
        break;
      }
      case 'textarea': {
        input = document.createElement('textarea');
        input.className = 'input textarea';
        input.rows = 3;
        input.placeholder = field.placeholder || '';
        // Auto-grow
        input.addEventListener('input', () => {
          input.style.height = 'auto';
          input.style.height = input.scrollHeight + 'px';
        });
        break;
      }
      default: {
        input = document.createElement('input');
        input.className = 'input';
        input.type = field.type || 'text';
        if (field.placeholder) input.placeholder = field.placeholder;
        if (field.step != null) input.step = field.step;
        break;
      }
    }

    input.id = commonId;
    input.name = field.key;
    if (field.readOnly) {
      input.readOnly = true;
      input.classList.add('input--readonly');
    }

    // Set initial value
    if (formData[field.key] !== undefined && formData[field.key] !== null) {
      if (field.type === 'date' && formData[field.key]) {
        // Normalise to YYYY-MM-DD for the native date input
        const d = new Date(formData[field.key]);
        if (!isNaN(d.getTime())) {
          input.value = d.toISOString().slice(0, 10);
        } else {
          input.value = formData[field.key];
        }
      } else {
        input.value = formData[field.key];
      }
    }

    // Error message element
    const errorEl = document.createElement('span');
    errorEl.className = 'form-error';

    // Helper to set another field's value programmatically
    function setFieldValue(key, value) {
      formData[key] = value;
      if (fieldMap[key]) {
        fieldMap[key].input.value = value != null ? value : '';
      }
    }

    // Track value changes
    input.addEventListener('input', () => {
      const val = field.type === 'number' ? parseFloat(input.value) : input.value;
      formData[field.key] = field.type === 'number' && isNaN(val) ? '' : val;
      errorEl.textContent = '';
      input.classList.remove('input--error');
      runComputeFields();
      if (typeof onFieldChange === 'function') {
        onFieldChange(field.key, formData[field.key], formData, setFieldValue);
      }
    });
    input.addEventListener('change', () => {
      const val = field.type === 'number' ? parseFloat(input.value) : input.value;
      formData[field.key] = field.type === 'number' && isNaN(val) ? '' : val;
      errorEl.textContent = '';
      input.classList.remove('input--error');
      runComputeFields();
      if (typeof onFieldChange === 'function') {
        onFieldChange(field.key, formData[field.key], formData, setFieldValue);
      }
    });

    group.appendChild(input);
    group.appendChild(errorEl);
    form.appendChild(group);

    fieldMap[field.key] = { input, errorEl, field };
  });

  // Custom content (e.g. history table)
  if (customContent) {
    const customDiv = document.createElement('div');
    customDiv.innerHTML = typeof customContent === 'string' ? customContent : '';
    body.appendChild(customDiv);
  }

  body.appendChild(form);
  panel.appendChild(body);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'modal-footer';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = onSave ? 'Cancel' : 'Close';
  cancelBtn.addEventListener('click', close);

  let saveBtn = null;
  if (typeof onSave === 'function') {
    saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn-primary';
    saveBtn.innerHTML = '<span class="btn-label">Save</span>';
    saveBtn.addEventListener('click', handleSave);
  }

  footer.appendChild(cancelBtn);
  if (saveBtn) footer.appendChild(saveBtn);
  panel.appendChild(footer);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // ── Animate in ──
  requestAnimationFrame(() => {
    overlay.classList.add('modal-overlay--visible');
    panel.classList.add('modal-panel--visible');
  });

  // ── Close on overlay click ──
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // ── Escape key ──
  function onKeyDown(e) {
    if (e.key === 'Escape') close();
    // Simple focus trap: Tab cycles within the panel
    if (e.key === 'Tab') {
      const focusable = panel.querySelectorAll(
        'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  document.addEventListener('keydown', onKeyDown);

  // Focus first input
  const firstInput = panel.querySelector('input, select, textarea');
  if (firstInput) setTimeout(() => firstInput.focus(), 100);

  // Run compute fields once to initialise calculated values
  runComputeFields();

  // ── Compute fields ──
  function runComputeFields() {
    if (!computeFields || computeFields.length === 0) return;
    computeFields.forEach(({ target, formula }) => {
      if (typeof formula !== 'function') return;
      const computed = formula(formData);
      formData[target] = computed;
      if (fieldMap[target]) {
        fieldMap[target].input.value = computed != null ? computed : '';
      }
    });
  }

  // ── Validation ──
  function validate() {
    let valid = true;
    fields.forEach((f) => {
      const { input, errorEl } = fieldMap[f.key];
      const value = formData[f.key];

      // Reset
      errorEl.textContent = '';
      input.classList.remove('input--error');

      if (f.required && (value === '' || value === null || value === undefined)) {
        errorEl.textContent = `${f.label} is required`;
        input.classList.add('input--error');
        valid = false;
      }

      if (f.type === 'number' && value !== '' && value !== null && value !== undefined) {
        const num = Number(value);
        if (isNaN(num)) {
          errorEl.textContent = `${f.label} must be a valid number`;
          input.classList.add('input--error');
          valid = false;
        } else if (f.required && num <= 0) {
          errorEl.textContent = `${f.label} must be greater than 0`;
          input.classList.add('input--error');
          valid = false;
        }
      }
    });
    return valid;
  }

  // ── Save handler ──
  async function handleSave() {
    if (!saveBtn) return;
    if (!validate()) return;

    const label = saveBtn.querySelector('.btn-label');
    saveBtn.disabled = true;
    if (label) label.textContent = 'Saving…';

    try {
      if (typeof onSave === 'function') {
        const result = await onSave({ ...formData });
        if (result && !result.success) {
          // Show top-level error
          const existingErr = form.querySelector('.form-error-top');
          if (existingErr) existingErr.remove();
          const errBlock = document.createElement('div');
          errBlock.className = 'form-error form-error-top';
          errBlock.textContent = result.error || 'An error occurred';
          form.prepend(errBlock);
          saveBtn.disabled = false;
          if (label) label.textContent = 'Save';
          return;
        }
      }
      close();
    } catch (err) {
      console.error('[Modal] Save error:', err);
      saveBtn.disabled = false;
      if (label) label.textContent = 'Save';
    }
  }

  // ── Close / cleanup ──
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    panel.classList.remove('modal-panel--visible');
    overlay.classList.remove('modal-overlay--visible');
    panel.classList.add('modal-panel--closing');
    overlay.classList.add('modal-overlay--closing');
    document.removeEventListener('keydown', onKeyDown);

    // Wait for animation then remove
    setTimeout(() => {
      overlay.remove();
      if (typeof onCancel === 'function') onCancel();
    }, 300);
  }

  return { close };
}
