import { db } from '../config/firebase.js';
import { doc, runTransaction } from 'firebase/firestore';

/**
 * Utility to generate auto-incrementing IDs like PRD-001 or PUR-00001
 */

/**
 * Format the ID string with prefix and padding
 */
export function generateId(prefix, currentCount) {
  // Use 5 digit padding for transactions, 3 for master data
  const isTransaction = ['PUR', 'SAL'].includes(prefix);
  const paddingLength = isTransaction ? 5 : 3;
  
  const numberStr = currentCount.toString().padStart(paddingLength, '0');
  return `${prefix}-${numberStr}`;
}

/**
 * Atomically increment the counter in Firestore and return a new ID
 * @param {string} prefix The ID prefix (e.g. 'PRD')
 * @returns {Promise<string>} The newly generated ID
 */
export async function getNextId(prefix) {
  if (!db) {
    // Fallback for local testing without Firebase
    const randomSuffix = Math.floor(Math.random() * 999).toString().padStart(3, '0');
    return `${prefix}-${randomSuffix}`;
  }

  const counterRef = doc(db, 'counters', prefix);

  try {
    const newId = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      let newCount = 1;
      if (counterDoc.exists()) {
        newCount = (counterDoc.data().count || 0) + 1;
      }
      
      transaction.set(counterRef, { count: newCount }, { merge: true });
      
      return generateId(prefix, newCount);
    });
    
    return newId;
  } catch (error) {
    console.error('Error generating ID:', error);
    throw error;
  }
}
