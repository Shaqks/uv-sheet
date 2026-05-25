import { db } from '../config/firebase.js';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { COLLECTIONS, ID_PREFIXES } from '../utils/constants.js';
import { getNextId } from '../utils/id-generator.js';
import { generateUID } from '../utils/helpers.js';

class BuyerServiceImpl {
  constructor() {
    this.collectionName = COLLECTIONS.buyers;
    this.subscribers = new Set();
    this.data = [];
    this.unsubscribe = null;
    this.init();
  }

  init() {
    if (!db) return;
    const q = query(collection(db, this.collectionName), orderBy('name'));
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      this.data = snapshot.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
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
    const customId = await getNextId(ID_PREFIXES.buyer);
    if (!db) {
      const newItem = { firebaseId: generateUID(), id: customId, ...data, createdAt: new Date() };
      this.data.push(newItem);
      this.notifySubscribers();
      return newItem;
    }
    const docRef = doc(collection(db, this.collectionName));
    await setDoc(docRef, { id: customId, ...data, createdAt: serverTimestamp() });
    return { firebaseId: docRef.id, id: customId };
  }

  async update(id, data) {
    if (!db) {
      const idx = this.data.findIndex(i => i.id === id || i.firebaseId === id);
      if (idx > -1) {
        this.data[idx] = { ...this.data[idx], ...data };
        this.notifySubscribers();
      }
      return;
    }
    const item = this.data.find(i => i.id === id || i.firebaseId === id);
    if (!item) throw new Error("Not found");
    await setDoc(doc(db, this.collectionName, item.firebaseId), data, { merge: true });
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

export const BuyerService = new BuyerServiceImpl();
