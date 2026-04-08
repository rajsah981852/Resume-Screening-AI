// ============================================================
// auth.js — Authentication helpers & handlers
// ============================================================

const API_BASE = 'http://localhost:8000';

// ── Token helpers ──────────────────────────────────────────

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

function setSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function logout() {
  clearSession();
  window.location.href = 'login.html';
}

// ── Auth guard — call at top of protected pages ────────────

function requireAuth() {
  const token = getToken();
  const user = getUser();
  if (!token || !user) {
    window.location.href = 'login.html';
    return null;
  }
  return user;
}

function requireAdmin() {
  const user = requireAuth();
  if (!user) return null;
  if (user.role !== 'admin') {
    window.location.href = 'index.html';
    return null;
  }
  return user;
}

// ── UI helpers ─────────────────────────────────────────────

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function showSuccess(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  btn.disabled = loading;
  if (text) text.classList.toggle('hidden', loading);
  if (loader) loader.classList.toggle('hidden', !loading);
}

// ── API request helper ─────────────────────────────────────

async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearSession();
    window.location.href = 'login.html';
    return;
  }

  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

async function apiRequestForm(path, formData) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (response.status === 401) {
    clearSession();
    window.location.href = 'login.html';
    return;
  }

  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

// ── Register handler ───────────────────────────────────────

async function handleRegister(e) {
  e.preventDefault();
  hideError('auth-error');
  hideError('auth-success');
  setLoading('submit-btn', true);

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (password.length < 8) {
    showError('auth-error', 'Password must be at least 8 characters.');
    setLoading('submit-btn', false);
    return;
  }

  try {
    const res = await apiRequest('/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    if (res.ok) {
      showSuccess('auth-success', 'Account created! Redirecting to login...');
      setTimeout(() => window.location.href = 'login.html', 1500);
    } else {
      showError('auth-error', res.data.detail || 'Registration failed.');
    }
  } catch (err) {
    showError('auth-error', 'Cannot connect to server. Is the backend running?');
  } finally {
    setLoading('submit-btn', false);
  }
}

// ── Login handler ──────────────────────────────────────────

async function handleLogin(e) {
  e.preventDefault();
  hideError('auth-error');
  setLoading('submit-btn', true);

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await apiRequest('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      const { access_token, user } = res.data;
      setSession(access_token, user);

      if (user.role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'index.html';
      }
    } else {
      showError('auth-error', res.data.detail || 'Invalid email or password.');
    }
  } catch (err) {
    showError('auth-error', 'Cannot connect to server. Is the backend running?');
  } finally {
    setLoading('submit-btn', false);
  }
}

// ── Redirect if already logged in (auth pages) ────────────

if (window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('register.html')) {
  const token = getToken();
  const user = getUser();
  if (token && user) {
    window.location.href = user.role === 'admin' ? 'admin.html' : 'index.html';
  }
}
