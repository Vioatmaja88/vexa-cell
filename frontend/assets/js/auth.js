// Authentication Module
const Auth = {
  initLogin() {
    const form = document.getElementById('loginForm');
    const btn = document.getElementById('loginBtn');
    const btnLoading = document.getElementById('loginBtnLoading');
    const togglePassword = document.getElementById('togglePassword');
    const toggleIcon = document.getElementById('toggleIcon');
    const passwordInput = document.getElementById('password');

    // Toggle password visibility
    togglePassword?.addEventListener('click', () => {
      const type = passwordInput.type === 'password' ? 'text' : 'password';
      passwordInput.type = type;
      toggleIcon.setAttribute('data-lucide', type === 'password' ? 'eye-off' : 'eye');
      lucide.createIcons();
    });

    // Form submit
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      // UI Loading state
      btn.classList.add('hidden');
      btnLoading.classList.remove('hidden');
      btnLoading.classList.add('flex');

      try {
        await App.login(email, password);
        Utils.showToast('success', 'Berhasil!', 'Anda telah masuk');
        
        // Redirect with animation
        setTimeout(() => {
          window.location.href = '/dashboard.html';
        }, 500);
        
      } catch (err) {
        // Reset button
        btn.classList.remove('hidden');
        btnLoading.classList.add('hidden');
        btnLoading.classList.remove('flex');
        
        // Shake animation on form
        form.classList.add('animate-shake');
        setTimeout(() => form.classList.remove('animate-shake'), 300);
      }
    });
  },

  initRegister() {
    const form = document.getElementById('registerForm');
    const btn = document.getElementById('registerBtn');
    const btnLoading = document.getElementById('registerBtnLoading');
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirmPassword');

    // Real-time password match validation
    confirmInput?.addEventListener('input', () => {
      if (passwordInput.value && confirmInput.value) {
        if (passwordInput.value !== confirmInput.value) {
          confirmInput.classList.add('border-red-300', 'focus:ring-red-500');
          confirmInput.classList.remove('border-gray-200', 'focus:ring-primary-500');
        } else {
          confirmInput.classList.remove('border-red-300', 'focus:ring-red-500');
          confirmInput.classList.add('border-gray-200', 'focus:ring-primary-500');
        }
      }
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const userData = {
        email: document.getElementById('email').value.trim(),
        password: passwordInput.value,
        fullName: document.getElementById('fullName')?.value.trim(),
        phone: document.getElementById('phone')?.value.trim()
      };

      // Validate password match
      if (userData.password !== confirmInput?.value) {
        Utils.showToast('error', 'Validasi', 'Password tidak cocok');
        confirmInput?.focus();
        return;
      }

      btn.classList.add('hidden');
      btnLoading.classList.remove('hidden');
      btnLoading.classList.add('flex');

      try {
        await App.register(userData);
        Utils.showToast('success', 'Akun dibuat!', 'Silakan lengkapi profil Anda');
        setTimeout(() => {
          window.location.href = '/dashboard.html';
        }, 500);
      } catch (err) {
        btn.classList.remove('hidden');
        btnLoading.classList.add('hidden');
        btnLoading.classList.remove('flex');
        form.classList.add('animate-shake');
        setTimeout(() => form.classList.remove('animate-shake'), 300);
      }
    });
  },

  async checkAuth() {
    if (!App.token) return false;
    try {
      const data = await App.request('/auth/me');
      App.user = data.data.user;
      return true;
    } catch {
      App.logout();
      return false;
    }
  },

  requireAuth(redirect = '/login.html') {
    if (!App.token) {
      window.location.href = redirect;
      return false;
    }
    return true;
  }
};

window.Auth = Auth;