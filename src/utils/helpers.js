import { FY_START_MONTH, STATUS_COLORS } from './constants.js';

export function formatCurrency(amount) {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatNumber(num) {
  if (num === undefined || num === null) return '-';
  return new Intl.NumberFormat('en-IN').format(num);
}

export function formatDate(date) {
  if (!date) return '-';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

export function formatDateTime(date) {
  if (!date) return '-';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function parseDate(dateString) {
  if (!dateString) return null;
  const parts = dateString.split('/');
  if (parts.length === 3) {
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }
  return new Date(dateString);
}

export function getFY(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  let startYear = d.getFullYear();
  if (d.getMonth() < FY_START_MONTH) {
    startYear -= 1;
  }
  const start = new Date(startYear, FY_START_MONTH, 1);
  const end = new Date(startYear + 1, FY_START_MONTH, 0, 23, 59, 59, 999);
  const nextYearShort = (startYear + 1).toString().slice(-2);
  
  return {
    label: `FY ${startYear}-${nextYearShort}`,
    start,
    end
  };
}

export function getCurrentFY() {
  return getFY(new Date());
}

export function getLastFY() {
  const now = new Date();
  let startYear = now.getFullYear() - 1;
  if (now.getMonth() < FY_START_MONTH) {
    startYear -= 1;
  }
  const dateInLastFY = new Date(startYear, FY_START_MONTH + 1, 1);
  return getFY(dateInLastFY);
}

export function isInDateRange(date, start, end) {
  if (!date || !start || !end) return true;
  const d = date instanceof Date ? date : new Date(date);
  return d >= start && d <= end;
}

export function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function throttle(fn, limit) {
  let inThrottle;
  return function(...args) {
    const context = this;
    if (!inThrottle) {
      fn.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export function generateUID() {
  return Math.random().toString(36).substring(2, 9);
}

export function calculateTotal(quantity, costPerUnit, transportCost = 0) {
  const q = parseFloat(quantity) || 0;
  const c = parseFloat(costPerUnit) || 0;
  const t = parseFloat(transportCost) || 0;
  return (q * c) + t;
}

export function getStatusColor(status) {
  return STATUS_COLORS[status] || 'badge-pending';
}

export function animateCountUp(element, endValue, duration = 1500, format = 'number') {
  if (!element) return;
  const startValue = 0;
  const startTime = performance.now();

  function easeOutExpo(x) {
    return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
  }

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const easedProgress = easeOutExpo(progress);
    const currentValue = startValue + (endValue - startValue) * easedProgress;

    if (format === 'currency') {
      element.textContent = formatCurrency(currentValue);
    } else {
      element.textContent = Math.round(currentValue).toLocaleString('en-IN');
    }

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      // Ensure final exact value
      if (format === 'currency') {
        element.textContent = formatCurrency(endValue);
      } else {
        element.textContent = endValue.toLocaleString('en-IN');
      }
    }
  }

  requestAnimationFrame(update);
}

export function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  return JSON.parse(JSON.stringify(obj));
}

export function toFirestoreDate(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  return d;
}

export function fromFirestoreDate(timestamp) {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate();
  return new Date(timestamp);
}
