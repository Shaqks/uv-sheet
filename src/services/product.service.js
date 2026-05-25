import { db } from '../config/firebase.js';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { COLLECTIONS, ID_PREFIXES } from '../utils/constants.js';
import { getNextId } from '../utils/id-generator.js';
import { generateUID } from '../utils/helpers.js';

class ProductServiceImpl {
  constructor() {
    this.collectionName = COLLECTIONS.products;
    this.subscribers = new Set();
    this.products = [];
    this.unsubscribe = null;
    this.init();
  }

  init() {
    if (!db) return;
    const q = query(collection(db, this.collectionName), orderBy('id'));
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      this.products = snapshot.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
      this.notifySubscribers();
    });
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    callback(this.products);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers() {
    this.subscribers.forEach(cb => cb(this.products));
  }

  async add(data) {
    const customId = await getNextId(ID_PREFIXES.product);
    
    if (!db) {
      const newProduct = { firebaseId: generateUID(), id: customId, ...data, createdAt: new Date() };
      this.products.push(newProduct);
      this.notifySubscribers();
      return newProduct;
    }

    const docRef = doc(collection(db, this.collectionName));
    const newDoc = {
      id: customId,
      ...data,
      createdAt: serverTimestamp()
    };
    await setDoc(docRef, newDoc);
    return { firebaseId: docRef.id, ...newDoc };
  }

  async update(firebaseId, data) {
    if (!db) {
      const idx = this.products.findIndex(p => p.firebaseId === firebaseId || p.id === firebaseId);
      if (idx > -1) {
        this.products[idx] = { ...this.products[idx], ...data };
        this.notifySubscribers();
      }
      return;
    }
    // Assume firebaseId is the doc id, but if user passed custom id, we need to find the doc
    let docId = firebaseId;
    const existing = this.products.find(p => p.id === firebaseId);
    if (existing) docId = existing.firebaseId;

    const docRef = doc(db, this.collectionName, docId);
    await setDoc(docRef, data, { merge: true });
  }

  async remove(firebaseId) {
    if (!db) {
      this.products = this.products.filter(p => p.firebaseId !== firebaseId && p.id !== firebaseId);
      this.notifySubscribers();
      return;
    }
    let docId = firebaseId;
    const existing = this.products.find(p => p.id === firebaseId);
    if (existing) docId = existing.firebaseId;
    
    await deleteDoc(doc(db, this.collectionName, docId));
  }

  getById(id) {
    return this.products.find(p => p.id === id);
  }
}

export const ProductService = new ProductServiceImpl();
