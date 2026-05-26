import { db } from '../config/firebase.js';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { COLLECTIONS, DEFAULT_CATEGORIES } from '../utils/constants.js';
import { generateUID } from '../utils/helpers.js';

class CategoryServiceImpl {
  constructor() {
    this.collectionName = COLLECTIONS.categories;
    this.subscribers = new Set();
    this.categories = [];
    this.unsubscribe = null;
    this.init();
  }

  init() {
    if (!db) return;
    if (this.unsubscribe) this.unsubscribe();
    const q = query(collection(db, this.collectionName));
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      this.categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      this.notifySubscribers();
    }, (error) => console.warn("CategoryService listener error:", error.code));
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    callback(this.categories);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers() {
    this.subscribers.forEach(cb => cb(this.categories));
  }

  async add(data) {
    if (!db) {
      const newCat = { id: generateUID(), ...data, createdAt: new Date() };
      this.categories.push(newCat);
      this.notifySubscribers();
      return newCat;
    }
    
    const id = generateUID();
    const docRef = doc(db, this.collectionName, id);
    await setDoc(docRef, {
      name: data.name,
      createdAt: serverTimestamp()
    });
    return { id };
  }

  async update(id, data) {
    if (!db) {
      const idx = this.categories.findIndex(c => c.id === id);
      if (idx > -1) {
        this.categories[idx] = { ...this.categories[idx], ...data };
        this.notifySubscribers();
      }
      return;
    }
    const docRef = doc(db, this.collectionName, id);
    await setDoc(docRef, { name: data.name }, { merge: true });
  }

  async remove(id) {
    if (!db) {
      this.categories = this.categories.filter(c => c.id !== id);
      this.notifySubscribers();
      return;
    }
    await deleteDoc(doc(db, this.collectionName, id));
  }
}

export const CategoryService = new CategoryServiceImpl();
