import { PurchaseService } from './purchase.service.js';
import { SaleService } from './sale.service.js';
import { InventoryService } from './inventory.service.js';
import { getFY, isInDateRange } from '../utils/helpers.js';

class DashboardServiceImpl {
  constructor() {
    this.subscribers = new Set();
    this.metrics = null;
    
    this.purchases = [];
    this.sales = [];
    this.inventory = [];

    this.updateMetrics = this.updateMetrics.bind(this);

    PurchaseService.subscribe(data => { this.purchases = data; this.updateMetrics(); });
    SaleService.subscribe(data => { this.sales = data; this.updateMetrics(); });
    InventoryService.subscribe(data => { this.inventory = data; this.updateMetrics(); });
  }

  updateMetrics() {
    const currentFY = getFY(new Date());
    const lastFY = getFY(new Date(currentFY.start.getTime() - 86400000)); // Subtract 1 day from start of current FY

    const allTime = this.calculatePeriodMetrics(null, null);
    const currentFYMetrics = this.calculatePeriodMetrics(currentFY.start, currentFY.end);
    const lastFYMetrics = this.calculatePeriodMetrics(lastFY.start, lastFY.end);
    
    const productStats = this.getProductStats();

    const metrics = {
      allTimeProfit: allTime.profit,
      currentFYProfit: currentFYMetrics.profit,
      lastFYProfit: lastFYMetrics.profit,
      
      allTimeRevenue: allTime.totalRevenue,
      currentFYRevenue: currentFYMetrics.totalRevenue,
      lastFYRevenue: lastFYMetrics.totalRevenue,
      
      topProducts: productStats.topProducts,
      worstProducts: productStats.worstProducts,
      topBuyers: this.getTopBuyers(),
      topSuppliers: this.getTopSuppliers(),
      
      monthlyTrend: this.getMonthlyTrend(),
      ordersByStatus: this.getOrdersByStatus(),
      
      totalStockValue: this.getInventoryStats().stockValue
    };

    this.metrics = metrics;
    this.notifySubscribers();
  }

  calculatePeriodMetrics(startDate, endDate) {
    const periodSales = this.sales.filter(s => s.status !== 'Cancelled' && isInDateRange(s.date, startDate, endDate));
    const periodPurchases = this.purchases.filter(p => p.status !== 'Cancelled' && isInDateRange(p.date, startDate, endDate));

    const totalRevenue = periodSales.reduce((sum, s) => sum + (s.totalSellingPrice || s.totalSellingAmount || 0), 0);
    const totalPurchaseCost = periodPurchases.reduce((sum, p) => sum + p.totalPurchaseCost, 0);
    
    // Calculate COGS (Cost of Goods Sold)
    const cogs = periodSales.reduce((sum, s) => {
      const product = this.inventory.find(i => i.productId === s.productId);
      const avgCost = product ? (product.avgCost || 0) : 0;
      return sum + ((s.quantity || 0) * avgCost);
    }, 0);

    const profit = totalRevenue - cogs;

    const ordersCount = periodSales.length;
    const purchasesCount = periodPurchases.length;

    return { totalRevenue, totalCost: cogs, totalPurchaseCost, profit, ordersCount, purchasesCount };
  }

  getProductStats(limit = 5) {
    const productSales = {};
    this.sales.filter(s => s.status !== 'Cancelled').forEach(s => {
      if (!productSales[s.productName]) productSales[s.productName] = 0;
      productSales[s.productName] += (s.totalSellingPrice || s.totalSellingAmount || 0);
    });

    const sorted = Object.entries(productSales)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      topProducts: sorted.slice(0, limit),
      worstProducts: [...sorted].reverse().slice(0, limit)
    };
  }

  getTopBuyers(limit = 5) {
    const buyerSales = {};
    this.sales.filter(s => s.status !== 'Cancelled').forEach(s => {
      if (!buyerSales[s.buyerName]) buyerSales[s.buyerName] = 0;
      buyerSales[s.buyerName] += (s.totalSellingPrice || s.totalSellingAmount || 0);
    });

    return Object.entries(buyerSales)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }

  getTopSuppliers(limit = 5) {
    const supplierPurchases = {};
    this.purchases.filter(p => p.status !== 'Cancelled').forEach(p => {
      if (!supplierPurchases[p.supplierName]) supplierPurchases[p.supplierName] = 0;
      supplierPurchases[p.supplierName] += p.totalPurchaseCost;
    });

    return Object.entries(supplierPurchases)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }

  getMonthlyTrend() {
    const data = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = targetMonth.toLocaleString('default', { month: 'short', year: '2-digit' });
      
      const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
      const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const metrics = this.calculatePeriodMetrics(startOfMonth, endOfMonth);
      
      data.push({
        label,
        revenue: metrics.totalRevenue,
        cost: metrics.totalCost,
        profit: metrics.profit
      });
    }
    return data;
  }

  getOrdersByStatus() {
    const counts = { 'Pending': 0, 'Confirmed': 0, 'Shipped': 0, 'Delivered': 0, 'Cancelled': 0 };
    this.sales.forEach(s => {
      const status = s.status || 'Pending';
      if (counts[status] !== undefined) counts[status]++;
      else counts[status] = 1;
    });
    return counts;
  }

  getInventoryStats() {
    const totalProducts = this.inventory.length;
    const stockValue = this.inventory.reduce((sum, i) => sum + (i.stockValue || 0), 0);
    const lowStockItems = this.inventory.filter(i => i.isLowStock && i.balanceStock > 0).length;
    const outOfStockItems = this.inventory.filter(i => i.balanceStock <= 0).length;

    return { totalProducts, stockValue, lowStockItems, outOfStockItems };
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    if (this.metrics) {
      callback(this.metrics);
    }
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers() {
    if (this.metrics) {
      this.subscribers.forEach(cb => cb(this.metrics));
    }
  }
}

export const DashboardService = new DashboardServiceImpl();
