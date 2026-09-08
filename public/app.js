// client state management variables
let currentUser = null;
let isRegisterMode = false;

// DOM selectors using getElementById
// getElementById docs: https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementById
const authSection = document.getElementById('auth-section');
const todoSection = document.getElementById('todo-section');
const userBar = document.getElementById('user-bar');
const userEmail = document.getElementById('user-email');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubmit = document.getElementById('auth-submit');
const toggleMsg = document.getElementById('toggle-msg');
const toggleAuthBtn = document.getElementById('toggle-auth-btn');
const logoutBtn = document.getElementById('logout-btn');
const addTodoForm = document.getElementById('add-todo-form');
const todoInput = document.getElementById('todo-input');
const todoList = document.getElementById('todo-list');

// fetch API wrapper for JSON endpoints
// fetch API docs: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
async function apiFetch(endpoint, options = {}) {
  const res = await fetch(endpoint, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// verify user session state on page load
async function checkAuth() {
  try {
    const data = await apiFetch('/api/auth/me');
    currentUser = data.user;
    renderUI();
    fetchTodos();
  } catch (err) {
    currentUser = null;
    renderUI();
  }
}

// update UI section visibility with classList
// classList API docs: https://developer.mozilla.org/en-US/docs/Web/API/Element/classList
function renderUI() {
  if (currentUser) {
    authSection.classList.add('hidden');
    todoSection.classList.remove('hidden');
    userBar.classList.remove('hidden');
    userEmail.textContent = currentUser.email;
  } else {
    authSection.classList.remove('hidden');
    todoSection.classList.add('hidden');
    userBar.classList.add('hidden');
  }
}

// toggle login and register mode
// addEventListener docs: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
toggleAuthBtn.addEventListener('click', () => {
  isRegisterMode = !isRegisterMode;
  authTitle.textContent = isRegisterMode ? 'Register' : 'Login';
  authSubmit.textContent = isRegisterMode ? 'Register' : 'Login';
  toggleMsg.textContent = isRegisterMode ? 'Already have an account?' : "Don't have an account?";
  toggleAuthBtn.textContent = isRegisterMode ? 'Login' : 'Register';
});

// submit auth form and set session cookie
// preventDefault docs: https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';

  try {
    const data = await apiFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    currentUser = data.user;
    renderUI();
    fetchTodos();
  } catch (err) {
    alert(err.message);
  }
});

// destroy session on logout
logoutBtn.addEventListener('click', async () => {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    currentUser = null;
    todoList.innerHTML = '';
    renderUI();
  } catch (err) {
    alert('Logout failed');
  }
});

// fetch user todos from server
async function fetchTodos() {
  try {
    const data = await apiFetch('/api/todos');
    renderTodos(data.todos);
  } catch (err) {
    console.error('Failed to fetch todos:', err);
  }
}

// render todo elements into the DOM
// createElement docs: https://developer.mozilla.org/en-US/docs/Web/API/Document/createElement
function renderTodos(todos) {
  todoList.innerHTML = '';
  todos.forEach(todo => {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    
    // safe string interpolation with escaping helper
    li.innerHTML = `
      <input type="checkbox" ${todo.completed ? 'checked' : ''} data-id="${todo.id}">
      <span>${escapeHtml(todo.title)}</span>
      <button class="delete-btn" data-id="${todo.id}">&times;</button>
    `;

    // checkbox toggle event for updating todo state
    li.querySelector('input[type="checkbox"]').addEventListener('change', async (e) => {
      try {
        await apiFetch(`/api/todos/${todo.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ completed: e.target.checked })
        });
        fetchTodos();
      } catch (err) {
        alert(err.message);
      }
    });

    // delete todo event handler
    li.querySelector('.delete-btn').addEventListener('click', async () => {
      try {
        await apiFetch(`/api/todos/${todo.id}`, { method: 'DELETE' });
        fetchTodos();
      } catch (err) {
        alert(err.message);
      }
    });

    todoList.appendChild(li);
  });
}

// add new todo form handler
addTodoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = todoInput.value.trim();
  if (!title) return;

  try {
    await apiFetch('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ title })
    });
    todoInput.value = '';
    fetchTodos();
  } catch (err) {
    alert(err.message);
  }
});

// escape HTML inputs to prevent cross-site scripting (XSS)
// XSS prevention guide: https://developer.mozilla.org/en-US/docs/Glossary/Cross-site_scripting
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, match => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[match]);
}

// initialize auth check on application startup
checkAuth();
