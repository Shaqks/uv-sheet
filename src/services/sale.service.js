import { db } from '../config/firebase.js';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { COLLECTIONS, ID_PREFIXES } from '../utils/constants.js';
import { getNextId } from '../utils/id-generator.js';
import { generateUID, toFirestoreDate, fromFirestoreDate } from '../utils/helpers.js';

class SaleServiceImpl {
  constructor() {
    this.collectionName = COLLECTIONS.sales;
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
    const customId = await getNextId(ID_PREFIXES.sale);
    
    // Ensure numeric fields — preserve field names from selling page
    const formattedData = {
      ...data,
      id: customId,
      quantity: parseFloat(data.quantity) || 0,
      sellingPricePerUnit: parseFloat(data.sellingPricePerUnit || data.sellingPrice) || 0,
      sellingTransportCost: parseFloat(data.sellingTransportCost) || 0,
      totalSellingPrice: parseFloat(data.totalSellingPrice || data.totalSellingAmount) || 0,
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
    if (formattedData.sellingPricePerUnit !== undefined) formattedData.sellingPricePerUnit = parseFloat(formattedData.sellingPricePerUnit) || 0;
    if (formattedData.sellingTransportCost !== undefined) formattedData.sellingTransportCost = parseFloat(formattedData.sellingTransportCost) || 0;
    if (formattedData.totalSellingPrice !== undefined) formattedData.totalSellingPrice = parseFloat(formattedData.totalSellingPrice) || 0;
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

export const SaleService = new SaleServiceImpl();
