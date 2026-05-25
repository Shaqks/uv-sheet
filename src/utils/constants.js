export const ORDER_STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

export const STATUS_COLORS = {
  'Pending': 'badge-pending',
  'Confirmed': 'badge-confirmed',
  'Shipped': 'badge-shipped',
  'Delivered': 'badge-delivered',
  'Cancelled': 'badge-cancelled'
};

export const COLLECTIONS = {
  products: 'products',
  suppliers: 'suppliers',
  buyers: 'buyers',
  categories: 'categories',
  purchases: 'purchases',
  sales: 'sales',
  counters: 'counters'
};

export const DEFAULT_CATEGORIES = [
  'Raw Materials',
  'Finished Goods',
  'Packaging',
  'Spare Parts',
  'Consumables',
  'Electronics',
  'Chemicals',
  'Other'
];

export const FY_START_MONTH = 3; // April (0-indexed)

export const CURRENCY = 'INR';

export const DEFAULT_UNIT = 'pieces';

export const PAGE_SIZES = [25, 50, 100];

export const ID_PREFIXES = {
  product: 'PRD',
  supplier: 'SUP',
  buyer: 'BUY',
  purchase: 'PUR',
  sale: 'SAL'
};

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '#/dashboard' },
  { id: 'buying', label: 'Purchases', icon: 'buying', path: '#/buying' },
  { id: 'selling', label: 'Sales', icon: 'selling', path: '#/selling' },
  { id: 'inventory', label: 'Inventory', icon: 'inventory', path: '#/inventory' },
  { id: 'masters', label: 'Master Data', icon: 'masters', path: '#/masters' }
];

export const DATE_PRESETS = [
  {
    label: 'Today',
    getRange: () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
  },
  {
    label: 'This Week',
    getRange: () => {
      const end = new Date();
      const start = new Date(end);
      start.setDate(end.getDate() - end.getDay()); // Sunday
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
  },
  {
    label: 'This Month',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
  },
  {
    label: 'This FY',
    getRange: () => {
      const now = new Date();
      let startYear = now.getFullYear();
      if (now.getMonth() < FY_START_MONTH) {
        startYear -= 1;
      }
      const start = new Date(startYear, FY_START_MONTH, 1);
      const end = new Date(startYear + 1, FY_START_MONTH, 0, 23, 59, 59, 999);
      return { start, end };
    }
  },
  {
    label: 'Last FY',
    getRange: () => {
      const now = new Date();
      let startYear = now.getFullYear() - 1;
      if (now.getMonth() < FY_START_MONTH) {
        startYear -= 1;
      }
      const start = new Date(startYear, FY_START_MONTH, 1);
      const end = new Date(startYear + 1, FY_START_MONTH, 0, 23, 59, 59, 999);
      return { start, end };
    }
  },
  {
    label: 'All Time',
    getRange: () => null
  }
];
