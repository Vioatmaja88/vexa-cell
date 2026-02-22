// Vexa Cell - Main Application
const API_BASE = '/api';

const App = {
  token: null,
  user: null,

  init() {
    this.loadAuth();
    this.setupGlobalListeners();
    this.initToasts();
  },

  loadAuth() {
    const token = localStorage.getItem('vexa_token');
    const userStr = localStorage.getItem('vexa_user');
    
    if (token && userStr) {
      this.token = token;
      this.user = JSON.parse(userStr);
      this.updateAuthUI(true);
    }
  },

  updateAuthUI(isLoggedIn) {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    
    if (isLoggedIn && this.user) {
      authButtons?.classList.add('hidden');
      userMenu?.classList.remove('hidden');
      userMenu?.classList.add('flex');
      userName.textContent = this.user.fullName?.split(' ')[0] || 'User';
    } else {
      authButtons?.classList.remove('hidden');
      userMenu?.classList.add('hidden');
      userMenu?.classList.remove('flex');
    }
  },

  setupGlobalListeners() {
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.logout();
    });

    // User dropdown toggle
    document.getElementById('userDropdownBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = document.getElementById('userDropdown');
      dropdown.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('userDropdown');
      const btn = document.getElementById('userDropdownBtn');
      if (dropdown && !dropdown.contains(e.target) && e.target !== btn) {
        dropdown.classList.add('hidden');
      }
    });

    // Mobile menu toggle
    document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
      const menu = document.getElementById('mobileMenu');
      menu.classList.toggle('hidden');
    });

    // Notification button
    document.getElementById('notificationBtn')?.addEventListener('click', () => {
      Utils.showToast('info', 'Notifikasi', 'Belum ada notifikasi baru');
    });
  },

  initToasts() {
    // Toast auto-dismiss
    document.addEventListener('click', (e) => {
      if (e.target.closest('.toast-close')) {
        e.target.closest('.toast').remove();
      }
    });
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      Utils.showToast('error', 'Error', error.message);
      throw error;
    }
  },

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    this.token = data.data.token;
    this.user = data.data.user;
    
    localStorage.setItem('vexa_token', this.token);
    localStorage.setItem('vexa_user', JSON.stringify(this.user));
    
    this.updateAuthUI(true);
    return data;
  },

  async register(userData) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    this.token = data.data.token;
    this.user = data.data.user;
    
    localStorage.setItem('vexa_token', this.token);
    localStorage.setItem('vexa_user', JSON.stringify(this.user));
    
    this.updateAuthUI(true);
    return data;
  },

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('vexa_token');
    localStorage.removeItem('vexa_user');
    this.updateAuthUI(false);
    window.location.href = '/';
  },

  showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
      overlay?.classList.remove('hidden');
      overlay?.classList.add('flex');
    } else {
      overlay?.classList.add('hidden');
      overlay?.classList.remove('flex');
    }
  },

  showModal(content, options = {}) {
    const container = document.getElementById('modalContainer');
    const { onClose, showClose = true } = options;

    container.innerHTML = `
      <div class="modal-backdrop" id="modalBackdrop">
        <div class="modal-content relative">
          ${showClose ? `
          <button class="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors" id="modalClose">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>` : ''}
          ${content}
        </div>
      </div>
    `;

    container.classList.remove('hidden');
    lucide.createIcons();

    document.getElementById('modalClose')?.addEventListener('click', () => {
      container.classList.add('hidden');
      onClose?.();
    });

    document.getElementById('modalBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'modalBackdrop') {
        container.classList.add('hidden');
        onClose?.();
      }
    });

    // Escape key to close
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        container.classList.add('hidden');
        onClose?.();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  },

  hideModal() {
    const container = document.getElementById('modalContainer');
    container.classList.add('hidden');
    container.innerHTML = '';
  }
};

// Toast Utility
const Toast = {
  show(type, title, message, duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
      success: 'check-circle',
      error: 'x-circle',
      warning: 'alert-circle',
      info: 'info'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i data-lucide="${icons[type]}" class="toast-icon"></i>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    // Auto remove
    if (duration) {
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 200);
      }, duration);
    }
  }
};

// Expose globally
window.App = App;
window.Toast = Toast;
window.Utils = { showToast: Toast.show.bind(Toast) };