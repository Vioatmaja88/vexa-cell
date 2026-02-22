// Vexa Cell - Utility Functions

const Utils = {
  // Debounce function for search inputs
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Format currency to IDR
  formatCurrency(amount, locale = 'id-ID') {
    if (!amount && amount !== 0) return 'Rp0';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },

  // Format number with separator
  formatNumber(num) {
    if (!num && num !== 0) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  },

  // Format date to Indonesian locale
  formatDate(date, options = {}) {
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    };
    return new Date(date).toLocaleDateString('id-ID', defaultOptions);
  },

  // Format datetime
  formatDateTime(date) {
    return new Date(date).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Format relative time (e.g., "2 menit yang lalu")
  formatRelativeTime(date) {
    const now = new Date();
    const then = new Date(date);
    const diff = now - then;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Baru saja';
    if (minutes < 60) return `${minutes} menit yang lalu`;
    if (hours < 24) return `${hours} jam yang lalu`;
    if (days < 7) return `${days} hari yang lalu`;
    return this.formatDate(date);
  },

  // Validate email format
  isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  // Validate phone number (Indonesian format)
  isValidPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return /^08[0-9]{8,12}$/.test(cleaned) || /^628[0-9]{8,12}$/.test(cleaned);
  },

  // Sanitize phone number
  sanitizePhone(phone) {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('62')) {
      cleaned = '0' + cleaned.substring(2);
    }
    return cleaned;
  },

  // Generate random string
  generateRandomString(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // Generate unique ID
  generateId(prefix = 'ID') {
    return `${prefix}-${Date.now()}-${this.generateRandomString(6).toUpperCase()}`;
  },

  // Copy to clipboard
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        return true;
      } catch (err) {
        return false;
      } finally {
        document.body.removeChild(textArea);
      }
    }
  },

  // Download file
  downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  // Download CSV
  downloadCSV(data, filename = 'export.csv') {
    if (!data || data.length === 0) {
      this.showToast('warning', 'Peringatan', 'Tidak ada data untuk diekspor');
      return;
    }

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(fieldName => {
        const value = row[fieldName];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(','))
    ].join('\n');

    this.downloadFile(csv, filename, 'text/csv');
    this.showToast('success', 'Export', 'File CSV berhasil diunduh');
  },

  // Show toast notification
  showToast(type, title, message, duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) {
      console.log(`[TOAST ${type.toUpperCase()}] ${title}: ${message}`);
      return;
    }

    const icons = {
      success: 'check-circle',
      error: 'x-circle',
      warning: 'alert-circle',
      info: 'info',
      loading: 'loader'
    };

    const colors = {
      success: 'green',
      error: 'red',
      warning: 'yellow',
      info: 'blue',
      loading: 'gray'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i data-lucide="${icons[type] || 'info'}" class="toast-icon text-${colors[type] || 'gray'}-500"></i>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      ${type !== 'loading' ? `
      <button class="toast-close" onclick="this.closest('.toast').remove()">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>` : ''}
    `;

    container.appendChild(toast);
    
    // Initialize Lucide icons for new toast
    if (window.lucide) {
      lucide.createIcons({ root: toast });
    }

    // Auto remove
    if (duration && type !== 'loading') {
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }

    return toast;
  },

  // Remove toast
  removeToast(toast) {
    if (toast) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }
  },

  // Show loading toast
  showLoading(message = 'Memproses...') {
    return this.showToast('loading', 'Loading', message, 0);
  },

  // Hide loading toast
  hideLoading(toast) {
    if (toast) {
      toast.remove();
    }
  },

  // Confirm dialog
  async confirm(message, title = 'Konfirmasi') {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
      modal.innerHTML = `
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" onclick="this.parentElement.remove()"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-scale-in">
          <div class="text-center">
            <div class="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i data-lucide="alert-triangle" class="w-6 h-6 text-yellow-600"></i>
            </div>
            <h3 class="font-bold text-lg text-navy-900 mb-2">${title}</h3>
            <p class="text-gray-600 text-sm mb-6">${message}</p>
            <div class="flex space-x-3">
              <button id="confirmCancel" class="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-navy-700 rounded-xl font-medium transition-all">
                Batal
              </button>
              <button id="confirmOk" class="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all">
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      if (window.lucide) lucide.createIcons();

      const cleanup = () => {
        document.getElementById('confirmOk')?.removeEventListener('click', handleOk);
        document.getElementById('confirmCancel')?.removeEventListener('click', handleCancel);
        modal.remove();
      };

      const handleOk = () => {
        cleanup();
        resolve(true);
      };

      const handleCancel = () => {
        cleanup();
        resolve(false);
      };

      document.getElementById('confirmOk')?.addEventListener('click', handleOk);
      document.getElementById('confirmCancel')?.addEventListener('click', handleCancel);
    });
  },

  // Alert dialog
  async alert(message, title = 'Informasi', type = 'info') {
    return new Promise((resolve) => {
      const icons = {
        info: { icon: 'info', color: 'blue', bg: 'blue-100' },
        success: { icon: 'check-circle', color: 'green', bg: 'green-100' },
        error: { icon: 'x-circle', color: 'red', bg: 'red-100' },
        warning: { icon: 'alert-triangle', color: 'yellow', bg: 'yellow-100' }
      };

      const config = icons[type] || icons.info;

      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
      modal.innerHTML = `
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" onclick="this.parentElement.remove()"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-scale-in">
          <div class="text-center">
            <div class="w-12 h-12 bg-${config.bg} rounded-full flex items-center justify-center mx-auto mb-4">
              <i data-lucide="${config.icon}" class="w-6 h-6 text-${config.color}-600"></i>
            </div>
            <h3 class="font-bold text-lg text-navy-900 mb-2">${title}</h3>
            <p class="text-gray-600 text-sm mb-6">${message}</p>
            <button id="alertOk" class="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all">
              OK
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      if (window.lucide) lucide.createIcons();

      const handleOk = () => {
        modal.remove();
        resolve();
      };

      document.getElementById('alertOk')?.addEventListener('click', handleOk);
    });
  },

  // Get URL parameter
  getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  },

  // Set URL parameter
  setUrlParam(param, value) {
    const url = new URL(window.location);
    url.searchParams.set(param, value);
    window.history.pushState({}, '', url);
  },

  // Remove URL parameter
  removeUrlParam(param) {
    const url = new URL(window.location);
    url.searchParams.delete(param);
    window.history.pushState({}, '', url);
  },

  // Local storage helpers
  storage: {
    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch {
        return defaultValue;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      localStorage.removeItem(key);
    },
    clear() {
      localStorage.clear();
    }
  },

  // Session storage helpers
  session: {
    get(key, defaultValue = null) {
      try {
        const item = sessionStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch {
        return defaultValue;
      }
    },
    set(key, value) {
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      sessionStorage.removeItem(key);
    }
  },

  // Check if element is in viewport
  isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  // Smooth scroll to element
  scrollToElement(element, offset = 0) {
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = elementPosition - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  },

  // Parse query string
  parseQueryString(queryString) {
    const params = {};
    new URLSearchParams(queryString).forEach((value, key) => {
      params[key] = value;
    });
    return params;
  },

  // Serialize object to query string
  serializeQueryString(obj) {
    return new URLSearchParams(obj).toString();
  },

  // Sleep/delay
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Retry function with exponential backoff
  async retry(fn, retries = 3, delay = 1000, backoff = 2) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err) {
        if (i === retries - 1) throw err;
        await this.sleep(delay * Math.pow(backoff, i));
      }
    }
  },

  // Check online status
  isOnline() {
    return navigator.onLine;
  },

  // Get online/offline status
  onOnline(callback) {
    window.addEventListener('online', callback);
  },

  onOffline(callback) {
    window.addEventListener('offline', callback);
  },

  // Detect mobile device
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  // Detect iOS
  isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  },

  // Detect Android
  isAndroid() {
    return /Android/.test(navigator.userAgent);
  },

  // Get browser info
  getBrowserInfo() {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    let version = 'Unknown';

    if (userAgent.indexOf('Chrome') > -1) {
      browser = 'Chrome';
      version = userAgent.split('Chrome/')[1]?.split(' ')[0];
    } else if (userAgent.indexOf('Safari') > -1) {
      browser = 'Safari';
      version = userAgent.split('Version/')[1]?.split(' ')[0];
    } else if (userAgent.indexOf('Firefox') > -1) {
      browser = 'Firefox';
      version = userAgent.split('Firefox/')[1];
    } else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident/') > -1) {
      browser = 'IE';
      version = userAgent.split('MSIE ')[1]?.split(';')[0];
    }

    return { browser, version, userAgent };
  },

  // Get OS info
  getOSInfo() {
    const platform = navigator.platform;
    const userAgent = navigator.userAgent;
    let os = 'Unknown';

    if (platform.indexOf('Win') !== -1) os = 'Windows';
    else if (platform.indexOf('Mac') !== -1) os = 'MacOS';
    else if (platform.indexOf('Linux') !== -1) os = 'Linux';
    else if (/Android/.test(userAgent)) os = 'Android';
    else if (/iPhone|iPad|iPod/.test(userAgent)) os = 'iOS';

    return os;
  },

  // Image helpers
  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  },

  // Preload images
  async preloadImages(sources) {
    return Promise.all(sources.map(src => this.loadImage(src).catch(() => null)));
  },

  // Compress image
  compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.8) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/jpeg', quality);
        };
      };
    });
  },

  // Get file extension
  getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
  },

  // Get file size in human readable format
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Generate QR code data URL (using API)
  async generateQRCode(text, size = 256) {
    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
    return apiUrl;
  },

  // Countdown timer
  createCountdown(endTime, callbacks = {}) {
    const { onTick, onComplete, onFormat } = callbacks;

    const update = () => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);

      if (remaining <= 0) {
        if (onComplete) onComplete();
        return 0;
      }

      const seconds = Math.floor(remaining / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      const timeObj = {
        days,
        hours: hours % 24,
        minutes: minutes % 60,
        seconds: seconds % 60,
        total: remaining
      };

      if (onTick) onTick(timeObj);

      return requestAnimationFrame(update);
    };

    return update();
  },

  // Format countdown time
  formatCountdown(timeObj) {
    const pad = (n) => n.toString().padStart(2, '0');
    if (timeObj.days > 0) {
      return `${timeObj.days}d ${pad(timeObj.hours)}h ${pad(timeObj.minutes)}m ${pad(timeObj.seconds)}s`;
    }
    return `${pad(timeObj.hours)}:${pad(timeObj.minutes)}:${pad(timeObj.seconds)}`;
  },

  // Animate number count up
  animateCountUp(element, start, end, duration = 1000) {
    const range = end - start;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (easeOutQuart)
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(start + (range * ease));

      element.textContent = current.toLocaleString('id-ID');

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  },

  // Add animation class on scroll
  animateOnScroll(selector, animationClass = 'animate-slide-up', threshold = 0.1) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add(animationClass);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold });

    document.querySelectorAll(selector).forEach(el => {
      el.style.opacity = '0';
      observer.observe(el);
    });
  },

  // Lazy load images
  lazyLoadImages(selector = 'img[data-src]') {
    const images = document.querySelectorAll(selector);
    
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          if (img.dataset.srcset) img.srcset = img.dataset.srcset;
          img.removeAttribute('data-src');
          img.removeAttribute('data-srcset');
          imageObserver.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  },

  // Password strength checker
  checkPasswordStrength(password) {
    let score = 0;
    const feedback = [];

    if (password.length >= 8) score++;
    else feedback.push('Minimal 8 karakter');

    if (/[a-z]/.test(password)) score++;
    else feedback.push('Huruf kecil');

    if (/[A-Z]/.test(password)) score++;
    else feedback.push('Huruf besar');

    if (/[0-9]/.test(password)) score++;
    else feedback.push('Angka');

    if (/[^a-zA-Z0-9]/.test(password)) score++;
    else feedback.push('Karakter khusus');

    const strength = {
      0: { label: 'Sangat Lemah', color: 'red', width: '20%' },
      1: { label: 'Lemah', color: 'red', width: '40%' },
      2: { label: 'Sedang', color: 'yellow', width: '60%' },
      3: { label: 'Kuat', color: 'blue', width: '80%' },
      4: { label: 'Sangat Kuat', color: 'green', width: '100%' },
      5: { label: 'Sangat Kuat', color: 'green', width: '100%' }
    };

    return {
      score,
      strength: strength[Math.min(score, 5)],
      feedback
    };
  },

  // Render password strength indicator
  renderPasswordStrength(password, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const result = this.checkPasswordStrength(password);
    
    container.innerHTML = `
      <div class="mt-2">
        <div class="flex justify-between text-xs mb-1">
          <span class="text-gray-600">Kekuatan Password</span>
          <span class="text-${result.strength.color}-600 font-medium">${result.strength.label}</span>
        </div>
        <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div class="h-full bg-${result.strength.color}-500 transition-all duration-300" 
               style="width: ${result.strength.width}"></div>
        </div>
        ${result.feedback.length > 0 && password.length > 0 ? `
        <ul class="mt-2 space-y-1">
          ${result.feedback.map(f => `
            <li class="text-xs text-gray-500 flex items-center">
              <i data-lucide="circle" class="w-3 h-3 mr-1"></i>
              ${f}
            </li>
          `).join('')}
        </ul>` : ''}
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  },

  // Truncate text
  truncateText(text, maxLength = 50, suffix = '...') {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + suffix;
  },

  // Highlight text
  highlightText(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  },

  // Group array by key
  groupBy(array, key) {
    return array.reduce((result, item) => {
      const groupKey = item[key];
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    }, {});
  },

  // Sort array by key
  sortBy(array, key, order = 'asc') {
    return [...array].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (order === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
  },

  // Remove duplicates from array
  unique(array, key = null) {
    if (key) {
      const seen = new Set();
      return array.filter(item => {
        const value = item[key];
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
      });
    }
    return [...new Set(array)];
  },

  // Chunk array
  chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },

  // Shuffle array (Fisher-Yates)
  shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  // Deep clone object
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  // Merge objects deeply
  deepMerge(target, source) {
    const output = { ...target };
    for (const key in source) {
      if (source[key] instanceof Object && key in target) {
        output[key] = this.deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    }
    return output;
  },

  // Get nested object value
  getNestedValue(obj, path, defaultValue = null) {
    return path.split('.').reduce((current, key) => {
      return current?.[key] ?? defaultValue;
    }, obj);
  },

  // Set nested object value
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!(key in current)) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
    return obj;
  },

  // Log with timestamp
  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${type.toUpperCase()}]`;
    
    switch (type) {
      case 'error':
        console.error(prefix, message);
        break;
      case 'warn':
        console.warn(prefix, message);
        break;
      case 'debug':
        if (process.env?.NODE_ENV === 'development') {
          console.log(prefix, message);
        }
        break;
      default:
        console.log(prefix, message);
    }
  },

  // Performance measurement
  measureTime(label, fn) {
    console.time(label);
    const result = fn();
    console.timeEnd(label);
    return result;
  },

  // Async performance measurement
  async measureTimeAsync(label, fn) {
    console.time(label);
    const result = await fn();
    console.timeEnd(label);
    return result;
  }
};

// Export for use in other files
window.Utils = Utils;

// Shorthand functions
window.$ = (selector) => document.querySelector(selector);
window.$$ = (selector) => document.querySelectorAll(selector);
window.showToast = Utils.showToast.bind(Utils);
window.showLoading = Utils.showLoading.bind(Utils);
window.hideLoading = Utils.hideLoading.bind(Utils);
window.confirm = Utils.confirm.bind(Utils);
window.alert = Utils.alert.bind(Utils);