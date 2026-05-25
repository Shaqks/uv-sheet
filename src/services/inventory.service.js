import { ProductService } from './product.service.js';
import { PurchaseService } from './purchase.service.js';
import { SaleService } from './sale.service.js';

/**
 * Inventory Service
 * Calculates real-time inventory based on purchases and sales
 */
class InventoryServiceImpl {
  constructor() {
    this.subscribers = new Set();
    this.inventory = [];
    this.products = [];
    this.purchases = [];
    this.sales = [];
    
    // We bind local methods so we can unsubscribe if needed
    this.updateData = this.updateData.bind(this);
    
    this.unsub1 = ProductService.subscribe(data => { this.products = data; this.updateData(); });
    this.unsub2 = PurchaseService.subscribe(data => { this.purchases = data; this.updateData(); });
    this.unsub3 = SaleService.subscribe(data => { this.sales = data; this.updateData(); });
  }

  updateData() {
    // Map products to their calculated inventory
    this.inventory = this.products.map(product => {
      const pid = product.id;
      
      // Find all purchases for this product (not cancelled)
      const productPurchases = this.purchases.filter(p => p.productId === pid && p.status !== 'Cancelled');
      const totalBought = productPurchases.reduce((sum, p) => sum + (p.quantity || 0), 0);
      
      // Calculate average cost for stock valuation
      const totalCost = productPurchases.reduce((sum, p) => sum + (p.totalPurchaseCost || 0), 0);
      const avgCost = totalBought > 0 ? totalCost / totalBought : 0;

      // Find all sales for this product (not cancelled)
      const productSales = this.sales.filter(s => s.productId === pid && s.status !== 'Cancelled');
      const totalSold = productSales.reduce((sum, s) => sum + (s.quantity || 0), 0);

      // Current balance
      const balanceStock = totalBought - totalSold;
      
      // Value
      const stockValue = balanceStock * avgCost;

      // Restock Date
      const sortedPurchases = [...productPurchases].sort((a, b) => {
        const da = a.date instanceof Date ? a.date : new Date(a.date);
        const db2 = b.date instanceof Date ? b.date : new Date(b.date);
        return db2 - da;
      });
      const lastRestock = sortedPurchases.length > 0 ? sortedPurchases[0].date : null;

      const reorderLevel = parseFloat(product.reorderLevel) || 0;

      return {
        ...product,
        productId: pid,
        totalBought,
        totalSold,
        balanceStock,
        avgCost,
        stockValue,
        lastRestockDate: lastRestock,
        isLowStock: balanceStock > 0 && balanceStock <= reorderLevel,
        isWarning: balanceStock < 0
      };
    });

    this.notifySubscribers();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    callback(this.inventory);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers() {
    this.subscribers.forEach(cb => cb(this.inventory));
  }

  async getProductHistory(productId) {
    const productPurchases = this.purchases
      .filter(p => p.productId === productId)
      .map(p => ({
        type: 'purchase',
        date: p.date,
        quantity: p.quantity,
        rate: p.buyingCostPerUnit || p.costPerUnit,
        total: p.totalPurchaseCost,
        status: p.status,
        party: p.supplierName
      }));

    const productSales = this.sales
      .filter(s => s.productId === productId)
      .map(s => ({
        type: 'sale',
        date: s.date,
        quantity: s.quantity,
        rate: s.sellingPricePerUnit || s.sellingPrice,
        total: s.totalSellingPrice || s.totalSellingAmount,
        status: s.status,
        party: s.buyerName
      }));

    return [...productPurchases, ...productSales].sort((a, b) => b.date - a.date);
  }
}

export const InventoryService = new InventoryServiceImpl();
