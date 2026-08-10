// =========================================================================
// APP.JS - Authentication & Redirection Handler
// Handles form submissions on root index.html and redirects to javatodoapp
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Grab DOM references to our forms
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  // Check if user is already logged in; if so, redirect directly to the main app
  if (localStorage.getItem('isLoggedIn') === 'true') {
    window.location.href = 'javatodoapp/index.html';
  }

  // =======================================================================
  // 1. HANDLE LOGIN SUBMISSION
  // =======================================================================
  if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
      event.preventDefault(); // Stop standard HTML form page reload

      const emailInput = document.getElementById('login-email');
      const passwordInput = document.getElementById('login-password');

      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value.trim() : '';

      if (email && password) {
        // Save simple auth state and user email to browser storage
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', email);

        // Optional feedback before redirect
        console.log(`Login successful for ${email}. Redirecting...`);

        // Redirect to javatodoapp index page
        window.location.href = 'javatodoapp/index.html';
      } else {
        alert('Please fill in both email and password fields.');
      }
    });
  }

  // =======================================================================
  // 2. HANDLE REGISTER SUBMISSION
  // =======================================================================
  if (registerForm) {
    registerForm.addEventListener('submit', (event) => {
      event.preventDefault(); // Stop standard HTML form page reload

      const regEmailInput = document.getElementById('register-email');
      const regPasswordInput = document.getElementById('register-password');

      const email = regEmailInput ? regEmailInput.value.trim() : '';
      const password = regPasswordInput ? regPasswordInput.value.trim() : '';

      if (email && password) {
        // Save auth state upon successful registration
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', email);

        alert('Account created successfully! Redirecting to your To-Do App...');

        // Redirect directly to javatodoapp index page
        window.location.href = 'javatodoapp/index.html';
      } else {
        alert('Please provide a valid email and password to register.');
      }
    });
  }
});
