/**
 * Login Page — Premium authentication screen with animated gradient background
 * @module pages/login
 */

import { signIn, onAuthChanged } from '../services/auth.service.js';
import { showToast } from '../components/toast.js';

/**
 * Renders the login page into the given container
 * @param {HTMLElement} container - The #app element
 * @param {Function} onLoginSuccess - Callback when login succeeds
 */
export function renderLoginPage(container, onLoginSuccess) {
  container.innerHTML = '';
  container.className = '';

  const page = document.createElement('div');
  page.className = 'auth-page';
  page.innerHTML = `
    <div class="auth-orbs">
      <div class="auth-orb auth-orb-1"></div>
      <div class="auth-orb auth-orb-2"></div>
      <div class="auth-orb auth-orb-3"></div>
    </div>
    <div class="auth-card">
      <div class="auth-logo">
        <div class="auth-logo-icon">
          <svg viewBox="0 0 40 40" width="40" height="40">
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#3b82f6"/>
                <stop offset="100%" style="stop-color:#8b5cf6"/>
              </linearGradient>
            </defs>
            <rect width="40" height="40" rx="10" fill="url(#logoGrad)"/>
            <text x="20" y="27" font-family="Inter,sans-serif" font-size="18" font-weight="800" fill="white" text-anchor="middle">UV</text>
          </svg>
        </div>
      </div>
      <h1 class="auth-title">Welcome Back</h1>
      <p class="auth-subtitle">Sign in to UV Sheet Management System</p>
      <form class="auth-form" id="loginForm" autocomplete="on">
        <div class="auth-input-group">
          <label for="loginEmail" class="auth-label">Email Address</label>
          <div class="auth-input-wrapper">
            <svg class="auth-input-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M22 7l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/>
            </svg>
            <input type="email" id="loginEmail" class="auth-input" placeholder="Enter your email" required autocomplete="email" />
          </div>
        </div>
        <div class="auth-input-group">
          <label for="loginPassword" class="auth-label">Password</label>
          <div class="auth-input-wrapper">
            <svg class="auth-input-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            <input type="password" id="loginPassword" class="auth-input" placeholder="Enter your password" required autocomplete="current-password" />
            <button type="button" class="auth-password-toggle" id="passwordToggle" tabindex="-1" aria-label="Toggle password visibility">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="auth-options">
          <label class="auth-remember">
            <input type="checkbox" id="rememberMe" checked />
            <span>Remember me</span>
          </label>
        </div>
        <div class="auth-error" id="loginError" style="display:none;"></div>
        <button type="submit" class="auth-btn" id="loginBtn">
          <span class="auth-btn-text">Sign In</span>
          <span class="auth-btn-loader" style="display:none;">
            <svg class="spinner" viewBox="0 0 24 24" width="20" height="20">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4" stroke-dashoffset="10" stroke-linecap="round">
                <animateTransform attributeName="transform" type="rotate" dur="0.8s" from="0 12 12" to="360 12 12" repeatCount="indefinite"/>
              </circle>
            </svg>
          </span>
        </button>
      </form>
      <p class="auth-footer">UV Sheet Business Management System &copy; ${new Date().getFullYear()}</p>
    </div>
  `;

  container.appendChild(page);

  // DOM References
  const form = page.querySelector('#loginForm');
  const emailInput = page.querySelector('#loginEmail');
  const passwordInput = page.querySelector('#loginPassword');
  const passwordToggle = page.querySelector('#passwordToggle');
  const loginBtn = page.querySelector('#loginBtn');
  const btnText = page.querySelector('.auth-btn-text');
  const btnLoader = page.querySelector('.auth-btn-loader');
  const errorDiv = page.querySelector('#loginError');

  // Password visibility toggle
  passwordToggle.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    passwordToggle.innerHTML = isPassword
      ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
           <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
           <line x1="1" y1="1" x2="23" y2="23"/>
         </svg>`
      : `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
           <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
           <circle cx="12" cy="12" r="3"/>
         </svg>`;
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showError('Please enter both email and password.');
      return;
    }

    // Show loading state
    setLoading(true);
    hideError();

    try {
      const result = await signIn(email, password);
      if (result.success) {
        showToast('Welcome back! Signed in successfully.', 'success');
        onLoginSuccess(result.data);
      } else {
        showError(getAuthErrorMessage(result.error));
        setLoading(false);
      }
    } catch (err) {
      showError(err.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  });

  // Focus email input on load
  setTimeout(() => emailInput.focus(), 300);

  function setLoading(loading) {
    loginBtn.disabled = loading;
    btnText.style.display = loading ? 'none' : 'inline';
    btnLoader.style.display = loading ? 'inline-flex' : 'none';
    emailInput.disabled = loading;
    passwordInput.disabled = loading;
  }

  function showError(msg) {
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
    errorDiv.classList.add('shake');
    setTimeout(() => errorDiv.classList.remove('shake'), 500);
  }

  function hideError() {
    errorDiv.style.display = 'none';
  }

  function getAuthErrorMessage(errorCode) {
    const messages = {
      'auth/user-not-found': 'No account found with this email address.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
      'auth/user-disabled': 'This account has been disabled. Contact your administrator.',
      'auth/invalid-credential': 'Invalid email or password. Please check and try again.',
      'auth/network-request-failed': 'Network error. Please check your internet connection.',
    };
    return messages[errorCode] || `Authentication failed. Please try again. (${errorCode})`;
  }
}
