/**
 * Frontend Application Controller
 * Handles authentication views, REST API fetch wrappers, dynamic list rendering,
 * and HTML5 Drag-and-Drop state tracking.
 * 
 * Reference Sources:
 * - MDN Document.querySelector: https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector
 * - MDN Fetch API: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
 * - MDN HTML Drag and Drop API: https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API
 */

// =========================================================================
// STATE & DOM SELECTORS
// =========================================================================
let currentUser = null;
let isRegisterMode = false;
let tasks = [];
let dragStartIndex;

// Cache DOM elements safely using getElementById (avoids selector parsing errors)
const userBar = document.getElementById('userBar');
const userGreeting = document.getElementById('userGreeting');
const logoutBtn = document.getElementById('logoutBtn');
const authSection = document.getElementById('authSection');
const todoSection = document.getElementById('todoSection');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authSubmit = document.getElementById('authSubmit');
const toggleMsg = document.getElementById('toggleMsg');
const toggleAuthBtn = document.getElementById('toggleAuthBtn');
const addTaskForm = document.getElementById('addTaskForm');
const taskInput = document.getElementById('taskInput');
const taskList = document.getElementById('taskList');

// =========================================================================
// HTTP API CLIENT
// =========================================================================
async function apiFetch(endpoint, options = {}) {
    const res = await fetch(endpoint, {
        headers: { 'Content-Type': 'application/json' },
        ...options
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

// Session check on page load
async function checkAuth() {
    try {
        const data = await apiFetch('/api/auth/me');
        currentUser = data.user;
        renderUI();
        fetchTasks();
    } catch (err) {
        currentUser = null;
        renderUI();
    }
}

function renderUI() {
    if (currentUser) {
        authSection.classList.add('hidden');
        todoSection.classList.remove('hidden');
        userBar.classList.remove('hidden');
        userGreeting.textContent = "Logged in as: " + currentUser.email;
    } else {
        authSection.classList.remove('hidden');
        todoSection.classList.add('hidden');
        userBar.classList.add('hidden');
    }
}

toggleAuthBtn.addEventListener('click', () => {
    isRegisterMode = !isRegisterMode;
    authTitle.textContent = isRegisterMode ? 'Register' : 'Login';
    authSubmit.textContent = isRegisterMode ? 'Register' : 'Login';
    toggleMsg.textContent = isRegisterMode ? 'Already have an account?' : "Don't have an account?";
    toggleAuthBtn.textContent = isRegisterMode ? 'Login' : 'Register';
});

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
        fetchTasks();
    } catch (err) {
        alert(err.message);
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        await apiFetch('/api/auth/logout', { method: 'POST' });
        currentUser = null;
        tasks = [];
        taskList.innerHTML = '';
        renderUI();
    } catch (err) {
        alert('Logout failed');
    }
});

async function fetchTasks() {
    try {
        const data = await apiFetch('/api/todos');
        tasks = data.todos;
        renderTasks();
    } catch (err) {
        console.error('Failed to fetch tasks:', err);
    }
}

// =========================================================================
// RENDER TASKS (SAFE DOM CONSTRUCTIONS)
// =========================================================================
function renderTasks() {
    taskList.innerHTML = "";

    for (let i = 0; i < tasks.length; i++) {
        const currentTask = tasks[i];

        const listItem = document.createElement("li");
        listItem.draggable = true;
        listItem.dataset.index = i;
        listItem.dataset.id = currentTask.id;

        // Checkbox
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = currentTask.completed;
        checkbox.dataset.id = currentTask.id;
        checkbox.style.marginRight = "10px";
        checkbox.onchange = function() { toggleComplete(this.dataset.id, this.checked); };

        // Title text
        const textSpan = document.createElement("span");
        textSpan.textContent = currentTask.title;
        if (currentTask.completed) {
            textSpan.classList.add("completed");
        }

        const contentDiv = document.createElement("div");
        contentDiv.style.display = "flex";
        contentDiv.style.alignItems = "center";
        contentDiv.appendChild(checkbox);
        contentDiv.appendChild(textSpan);

        listItem.appendChild(contentDiv);

        // Action buttons
        const actionsDiv = document.createElement("div");
        actionsDiv.className = "actions";

        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.dataset.id = currentTask.id;
        editBtn.dataset.title = currentTask.title;
        editBtn.onclick = function() { editTask(this.dataset.id, this.dataset.title); };

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "delete-btn";
        deleteBtn.dataset.id = currentTask.id;
        deleteBtn.onclick = function() { deleteTask(this.dataset.id); };

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        listItem.appendChild(actionsDiv);

        // Drag & Drop Event Binds
        listItem.addEventListener('dragstart', dragStart);
        listItem.addEventListener('dragover', dragOver);
        listItem.addEventListener('drop', dragDrop);
        listItem.addEventListener('dragenter', dragEnter);
        listItem.addEventListener('dragleave', dragLeave);
        listItem.addEventListener('dragend', dragEnd);

        taskList.appendChild(listItem);
    }
}

// =========================================================================
// TASK MUTATION HANDLERS
// =========================================================================
addTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = taskInput.value.trim();
    if (!title) return;

    try {
        await apiFetch('/api/todos', {
            method: 'POST',
            body: JSON.stringify({ title })
        });
        taskInput.value = "";
        fetchTasks();
    } catch (err) {
        alert(err.message);
    }
});

async function toggleComplete(id, completed) {
    try {
        await apiFetch(`/api/todos/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ completed })
        });
        fetchTasks();
    } catch (err) {
        alert(err.message);
    }
}

async function editTask(id, currentTitle) {
    const updatedTitle = prompt("Update your task:", currentTitle);
    if (updatedTitle !== null && updatedTitle.trim() !== "") {
        try {
            await apiFetch(`/api/todos/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ title: updatedTitle.trim() })
            });
            fetchTasks();
        } catch (err) {
            alert(err.message);
        }
    }
}

async function deleteTask(id) {
    try {
        await apiFetch(`/api/todos/${id}`, { method: 'DELETE' });
        fetchTasks();
    } catch (err) {
        alert(err.message);
    }
}

// =========================================================================
// DRAG AND DROP HANDLERS
// =========================================================================
function dragStart() {
    dragStartIndex = +this.dataset.index;
    this.classList.add('dragging');
}

function dragOver(e) {
    e.preventDefault();
}

function dragEnter() {
    this.classList.add('over');
}

function dragLeave() {
    this.classList.remove('over');
}

function dragDrop() {
    const dragEndIndex = +this.dataset.index;
    swapItems(dragStartIndex, dragEndIndex);
    this.classList.remove('over');
}

function dragEnd() {
    this.classList.remove('dragging');
}

function swapItems(fromIndex, toIndex) {
    const temp = tasks[fromIndex];
    tasks[fromIndex] = tasks[toIndex];
    tasks[toIndex] = temp;
    renderTasks();
}

// Start Session Initialization
checkAuth();