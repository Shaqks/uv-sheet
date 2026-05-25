import { db } from '../config/firebase.js';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { COLLECTIONS, ID_PREFIXES } from '../utils/constants.js';
import { getNextId } from '../utils/id-generator.js';
import { generateUID, toFirestoreDate, fromFirestoreDate } from '../utils/helpers.js';

class PurchaseServiceImpl {
  constructor() {
    this.collectionName = COLLECTIONS.purchases;
    this.subscribers = new Set();
    this.data = [];
    this.unsubscribe = null;
    this.init();
  }

  init() {
    if (!db) return;
    const q = query(collection(db, this.collectionName), orderBy('createdAt', 'desc'));
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      this.data = snapshot.docs.map(doc => {
        const item = doc.data();
        return {
          firebaseId: doc.id,
          ...item,
          date: fromFirestoreDate(item.date),
          createdAt: fromFirestoreDate(item.createdAt)
        };
      });
      this.notifySubscribers();
    });
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    callback(this.data);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers() {
    this.subscribers.forEach(cb => cb(this.data));
  }

  async add(data) {
    const customId = await getNextId(ID_PREFIXES.purchase);
    
    // Ensure numeric fields — preserve original field names from buying page
    const formattedData = {
      ...data,
      id: customId,
      quantity: parseFloat(data.quantity) || 0,
      buyingCostPerUnit: parseFloat(data.buyingCostPerUnit || data.costPerUnit) || 0,
      buyingTransportCost: parseFloat(data.buyingTransportCost || data.transportCost) || 0,
      totalPurchaseCost: parseFloat(data.totalPurchaseCost) || 0,
      date: toFirestoreDate(data.date),
      createdAt: serverTimestamp()
    };

    if (!db) {
      const newItem = { firebaseId: generateUID(), ...formattedData, date: new Date(data.date), createdAt: new Date() };
      this.data.unshift(newItem);
      this.notifySubscribers();
      return newItem;
    }
    
    const docRef = doc(collection(db, this.collectionName));
    await setDoc(docRef, formattedData);
    return { firebaseId: docRef.id, id: customId };
  }

  async update(id, data) {
    const formattedData = { ...data };
    if (formattedData.quantity !== undefined) formattedData.quantity = parseFloat(formattedData.quantity) || 0;
    if (formattedData.buyingCostPerUnit !== undefined) formattedData.buyingCostPerUnit = parseFloat(formattedData.buyingCostPerUnit) || 0;
    if (formattedData.buyingTransportCost !== undefined) formattedData.buyingTransportCost = parseFloat(formattedData.buyingTransportCost) || 0;
    if (formattedData.totalPurchaseCost !== undefined) formattedData.totalPurchaseCost = parseFloat(formattedData.totalPurchaseCost) || 0;
    if (formattedData.date !== undefined) formattedData.date = toFirestoreDate(formattedData.date);

    if (!db) {
      const idx = this.data.findIndex(i => i.id === id || i.firebaseId === id);
      if (idx > -1) {
        this.data[idx] = { ...this.data[idx], ...formattedData, date: data.date ? new Date(data.date) : this.data[idx].date };
        this.notifySubscribers();
      }
      return;
    }
    
    const item = this.data.find(i => i.id === id || i.firebaseId === id);
    if (!item) throw new Error("Not found");
    
    await setDoc(doc(db, this.collectionName, item.firebaseId), formattedData, { merge: true });
  }

  async remove(id) {
    if (!db) {
      this.data = this.data.filter(i => i.id !== id && i.firebaseId !== id);
      this.notifySubscribers();
      return;
    }
    const item = this.data.find(i => i.id === id || i.firebaseId === id);
    if (item) await deleteDoc(doc(db, this.collectionName, item.firebaseId));
  }
}

export const PurchaseService = new PurchaseServiceImpl();
