import { auth } from '../config/firebase.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

/**
 * Sign in user with email and password
 */
export async function signIn(email, password) {
  if (!auth || auth.app?.options?.apiKey === "AIzaSy_YOUR_API_KEY") {
    console.warn("Demo mode: logging in automatically with local session.");
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate delay
    localStorage.setItem('demo_logged_in', 'true');
    if (window.__demoAuthCallback) {
      window.__demoAuthCallback({ email, displayName: 'Demo User' });
    }
    return { success: true, user: { email, displayName: 'Demo User' } };
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error("Login error:", error);
    let message = "An error occurred during login.";
    
    // Firebase uses invalid-credential or wrong-password/user-not-found depending on the version and settings
    if (error.code === 'auth/wrong-password') {
      message = "Wrong password";
    } else if (error.code === 'auth/user-not-found') {
      message = "Unauthorised access";
    } else if (error.code === 'auth/invalid-credential') {
      message = "Unauthorised access or wrong password";
    } else if (error.code === 'auth/too-many-requests') {
      message = "Too many failed attempts. Please try again later.";
    }
    
    throw new Error(message);
  }
}

/**
 * Sign out current user
 */
export async function signOutUser() {
  if (!auth || auth.app?.options?.apiKey === "AIzaSy_YOUR_API_KEY") {
    localStorage.removeItem('demo_logged_in');
    if (window.__demoAuthCallback) {
      window.__demoAuthCallback(null);
    }
    return { success: true };
  }
  
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    throw new Error("Failed to sign out.");
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthChanged(callback) {
  if (!auth || auth.app?.options?.apiKey === "AIzaSy_YOUR_API_KEY") {
    console.warn("Auth bypassed (Demo Mode).");
    window.__demoAuthCallback = callback;
    
    setTimeout(() => {
      const isDemoLoggedIn = localStorage.getItem('demo_logged_in');
      if (isDemoLoggedIn) {
        callback({ email: 'demo@uvsheet.com', displayName: 'Demo User' });
      } else {
        callback(null);
      }
    }, 500);
    
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

/**
 * Get current user object
 */
export function getCurrentUser() {
  if (!auth || auth.app?.options?.apiKey === "AIzaSy_YOUR_API_KEY") {
    return localStorage.getItem('demo_logged_in') 
      ? { email: 'demo@uvsheet.com', displayName: 'Demo User' } 
      : null;
  }
  return auth.currentUser;
}
