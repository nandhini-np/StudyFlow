// ===== GLOBAL VARIABLES =====
let currentUser = null;
let tasks = [];
let streak = 0;
let lastCompletionDate = null;
let currentFilter = 'all';
let currentPage = 'dashboard';
let currentDate = new Date();
let selectedDate = new Date();

// Motivational quotes
const quotes = [
    "The secret of getting ahead is getting started.",
    "Don't watch the clock; do what it does. Keep going.",
    "Success is the sum of small efforts repeated day in and day out.",
    "The future depends on what you do today.",
    "Believe you can and you're halfway there.",
    "Study while others are sleeping; work while others are loafing.",
    "The expert in anything was once a beginner.",
    "Your education is a dress rehearsal for a life that is yours to lead."
];

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

function initApp() {
    // Check authentication
    checkAuth();
    
    // Load theme preference
    loadTheme();
    
    // Setup event listeners
    setupEventListeners();
    
    // If on auth pages, return
    if (window.location.pathname.includes('login.html') || 
        window.location.pathname.includes('signup.html')) {
        setupAuthListeners();
        return;
    }
    
    // Initialize dashboard
    loadUserData();
    updateUI();
    renderCurrentPage();
    checkDeadlines();
    
    // Update date/time every minute
    setInterval(updateDateTime, 60000);
    updateDateTime();
}

// ===== AUTHENTICATION =====
function checkAuth() {
    const user = localStorage.getItem('currentUser');
    const currentPath = window.location.pathname;
    
    if (user) {
        currentUser = JSON.parse(user);
        
        // Redirect to index if on auth pages
        if (currentPath.includes('login.html') || currentPath.includes('signup.html')) {
            window.location.href = 'index.html';
        }
    } else {
        // Redirect to login if not on auth pages
        if (!currentPath.includes('login.html') && !currentPath.includes('signup.html')) {
            window.location.href = 'login.html';
        }
    }
}

function setupAuthListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    
    // Theme toggle for auth pages
    const themeToggle = document.querySelector('.theme-toggle.floating');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        const userData = {
            email: user.email,
            name: user.name,
            id: user.id
        };
        localStorage.setItem('currentUser', JSON.stringify(userData));
        window.location.href = 'index.html';
    } else {
        showError('loginError', 'Invalid email or password');
    }
}

function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirm').value;
    
    if (password !== confirmPassword) {
        showError('signupError', 'Passwords do not match');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    if (users.find(u => u.email === email)) {
        showError('signupError', 'Email already registered');
        return;
    }
    
    const newUser = {
        id: Date.now().toString(),
        name,
        email,
        password
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    const userData = {
        email: newUser.email,
        name: newUser.name,
        id: newUser.id
    };
    localStorage.setItem('currentUser', JSON.stringify(userData));
    window.location.href = 'index.html';
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// ===== DATA MANAGEMENT =====
function loadUserData() {
    if (!currentUser) return;
    
    const userTasksKey = `tasks_${currentUser.id}`;
    const userStreakKey = `streak_${currentUser.id}`;
    
    const savedTasks = localStorage.getItem(userTasksKey);
    tasks = savedTasks ? JSON.parse(savedTasks) : [];
    
    const savedStreak = localStorage.getItem(userStreakKey);
    if (savedStreak) {
        const streakData = JSON.parse(savedStreak);
        streak = streakData.streak || 0;
        lastCompletionDate = streakData.lastDate || null;
    }
    
    // Add sample tasks if empty
    if (tasks.length === 0) {
        addSampleTasks();
    }
}

function saveUserData() {
    if (!currentUser) return;
    
    const userTasksKey = `tasks_${currentUser.id}`;
    const userStreakKey = `streak_${currentUser.id}`;
    
    localStorage.setItem(userTasksKey, JSON.stringify(tasks));
    localStorage.setItem(userStreakKey, JSON.stringify({
        streak: streak,
        lastDate: lastCompletionDate
    }));
}

function addSampleTasks() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    tasks = [
        {
            id: '1',
            subject: 'Mathematics',
            description: 'Complete calculus problems',
            deadline: tomorrow.toISOString().slice(0, 16),
            priority: 'high',
            completed: false,
            createdAt: new Date().toISOString()
        },
        {
            id: '2',
            subject: 'Physics',
            description: 'Study quantum mechanics',
            deadline: nextWeek.toISOString().slice(0, 16),
            priority: 'medium',
            completed: false,
            createdAt: new Date().toISOString()
        }
    ];
    saveUserData();
}

// ===== TASK MANAGEMENT =====
function addTask(taskData) {
    const newTask = {
        id: Date.now().toString(),
        ...taskData,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    tasks.push(newTask);
    saveUserData();
    renderTasks();
    updateUI();
    
    showNotification('Task added successfully!', 'success');
}

function updateTask(taskId, updates) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
        saveUserData();
        renderTasks();
        updateUI();
        
        showNotification('Task updated successfully!', 'success');
    }
}

function deleteTask(taskId) {
    tasks = tasks.filter(t => t.id !== taskId);
    saveUserData();
    renderTasks();
    updateUI();
    
    showNotification('Task deleted!', 'info');
}

function toggleTaskComplete(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        
        if (task.completed) {
            updateStreak();
        }
        
        saveUserData();
        renderTasks();
        updateUI();
    }
}

// ===== STREAK MANAGEMENT =====
function updateStreak() {
    const today = new Date().toDateString();
    
    if (lastCompletionDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (lastCompletionDate === yesterday) {
            streak += 1;
        } else {
            streak = 1;
        }
        
        lastCompletionDate = today;
        saveUserData();
    }
}

// ===== UI UPDATES =====
function updateUI() {
    if (!currentUser) return;
    
    // Update user name displays
    const userNameElements = document.querySelectorAll('#sidebarUserName, #headerUserName');
    userNameElements.forEach(el => {
        if (el) el.textContent = currentUser.name;
    });
    
    // Update stats
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    
    // Update DOM elements
    updateElement('totalTasks', total);
    updateElement('completedTasks', completed);
    updateElement('pendingTasks', pending);
    updateElement('progressPercent', `${percent}% Completed`);
    updateElement('streakCount', streak);
    updateElement('completionRate', `${percent}%`);
    
    // Update progress bar
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        progressFill.style.width = `${percent}%`;
    }
    
    // Update priority distribution
    const highCount = tasks.filter(t => t.priority === 'high').length;
    const mediumCount = tasks.filter(t => t.priority === 'medium').length;
    const lowCount = tasks.filter(t => t.priority === 'low').length;
    
    updateElement('highCount', highCount);
    updateElement('mediumCount', mediumCount);
    updateElement('lowCount', lowCount);
    
    // Update quote
    updateQuote();
}

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function updateDateTime() {
    const now = new Date();
    const hour = now.getHours();
    
    let greeting = 'Good ';
    if (hour < 12) greeting += 'Morning';
    else if (hour < 18) greeting += 'Afternoon';
    else greeting += 'Evening';
    
    const greetingEl = document.getElementById('greetingMsg');
    if (greetingEl) {
        greetingEl.textContent = `${greeting}, ${currentUser?.name || 'Scholar'}!`;
    }
    
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        dateEl.textContent = now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

function updateQuote() {
    const quoteEl = document.getElementById('quoteText');
    if (quoteEl) {
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        quoteEl.textContent = randomQuote;
    }
}

// ===== TASK RENDERING =====
function renderTasks() {
    const container = document.getElementById('taskContainer');
    const emptyState = document.getElementById('emptyState');
    
    if (!container) return;
    
    let filteredTasks = filterTasks();
    filteredTasks = sortTasks(filteredTasks);
    
    if (filteredTasks.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    container.innerHTML = filteredTasks.map(task => createTaskCard(task)).join('');
    
    // Render deadlines on dashboard
    renderDeadlines();
}

function filterTasks() {
    switch(currentFilter) {
        case 'completed':
            return tasks.filter(t => t.completed);
        case 'pending':
            return tasks.filter(t => !t.completed);
        default:
            return tasks;
    }
}

function sortTasks(taskArray) {
    const sortSelect = document.getElementById('sortSelect');
    const sortBy = sortSelect ? sortSelect.value : 'deadline';
    
    return [...taskArray].sort((a, b) => {
        if (sortBy === 'deadline') {
            return new Date(a.deadline) - new Date(b.deadline);
        } else {
            const priorityOrder = { high: 1, medium: 2, low: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
    });
}

function createTaskCard(task) {
    const deadline = new Date(task.deadline);
    const isOverdue = !task.completed && deadline < new Date();
    
    return `
        <div class="task-card priority-${task.priority} ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
            <div class="task-header">
                <h3>${task.subject}</h3>
                <span class="priority-badge">${task.priority.toUpperCase()}</span>
            </div>
            <p class="task-description">${task.description}</p>
            <div class="task-deadline">
                <i class="far fa-calendar-alt"></i>
                <span style="color: ${isOverdue ? 'var(--danger-color)' : 'inherit'}">
                    ${deadline.toLocaleString()}
                    ${isOverdue ? ' (Overdue!)' : ''}
                </span>
            </div>
            <div class="task-actions">
                <button onclick="toggleTaskComplete('${task.id}')" class="complete-btn">
                    <i class="fas fa-check-circle"></i>
                    ${task.completed ? 'Undo' : 'Complete'}
                </button>
                <button onclick="editTask('${task.id}')" class="edit-btn">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button onclick="deleteTask('${task.id}')" class="delete-btn">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
}

function renderDeadlines() {
    const container = document.getElementById('deadlineList');
    if (!container) return;
    
    const upcomingTasks = tasks
        .filter(t => !t.completed)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 3);
    
    if (upcomingTasks.length === 0) {
        container.innerHTML = '<p class="no-deadlines">No upcoming deadlines</p>';
        return;
    }
    
    container.innerHTML = upcomingTasks.map(task => {
        const deadline = new Date(task.deadline);
        return `
            <div class="task-card priority-${task.priority}">
                <h3>${task.subject}</h3>
                <p>${task.description}</p>
                <div class="task-deadline">
                    <i class="far fa-clock"></i>
                    <span>Due: ${deadline.toLocaleString()}</span>
                </div>
            </div>
        `;
    }).join('');
}

function editTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Switch to planner page
    switchPage('planner');
    
    // Fill form with task data
    document.getElementById('subject').value = task.subject;
    document.getElementById('taskDesc').value = task.description;
    document.getElementById('deadline').value = task.deadline;
    document.getElementById('priority').value = task.priority;
    document.getElementById('editId').value = task.id;
    document.getElementById('submitTaskBtn').innerHTML = '<i class="fas fa-save"></i> Update Task';
}

// ===== DEADLINE CHECKING =====
function checkDeadlines() {
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000));
    
    tasks.forEach(task => {
        if (!task.completed) {
            const deadline = new Date(task.deadline);
            
            if (deadline < now) {
                showNotification(`Task "${task.subject}" is overdue!`, 'warning');
            } else if (deadline <= twoDaysFromNow) {
                showNotification(`Task "${task.subject}" is due soon!`, 'info');
            }
        }
    });
}

// ===== CALENDAR FUNCTIONS =====
function renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthEl = document.getElementById('currentMonth');
    
    if (!calendarGrid || !currentMonthEl) return;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    currentMonthEl.textContent = new Date(year, month).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let calendarHTML = `
        <div class="calendar-day-header">Sun</div>
        <div class="calendar-day-header">Mon</div>
        <div class="calendar-day-header">Tue</div>
        <div class="calendar-day-header">Wed</div>
        <div class="calendar-day-header">Thu</div>
        <div class="calendar-day-header">Fri</div>
        <div class="calendar-day-header">Sat</div>
    `;
    
    // Previous month days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
        calendarHTML += `<div class="calendar-day other-month">${prevMonthDays - i}</div>`;
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasTasks = tasks.some(t => t.deadline.startsWith(dateStr));
        const isSelected = selectedDate.toDateString() === new Date(year, month, day).toDateString();
        
        calendarHTML += `
            <div class="calendar-day ${hasTasks ? 'has-tasks' : ''} ${isSelected ? 'selected' : ''}" 
                 onclick="selectDate('${dateStr}')">
                ${day}
            </div>
        `;
    }
    
    // Next month days
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const remainingDays = totalCells - (firstDay + daysInMonth);
    for (let i = 1; i <= remainingDays; i++) {
        calendarHTML += `<div class="calendar-day other-month">${i}</div>`;
    }
    
    calendarGrid.innerHTML = calendarHTML;
}

function selectDate(dateStr) {
    selectedDate = new Date(dateStr);
    renderCalendar();
    
    const tasksOnDate = tasks.filter(t => t.deadline.startsWith(dateStr));
    const displayEl = document.getElementById('selectedDateDisplay');
    const tasksEl = document.getElementById('selectedDateTasks');
    
    if (displayEl) {
        displayEl.textContent = selectedDate.toLocaleDateString();
    }
    
    if (tasksEl) {
        if (tasksOnDate.length === 0) {
            tasksEl.innerHTML = '<p>No tasks for this date</p>';
        } else {
            tasksEl.innerHTML = tasksOnDate.map(task => `
                <div class="task-card priority-${task.priority}">
                    <h3>${task.subject}</h3>
                    <p>${task.description}</p>
                    <p>Status: ${task.completed ? '✅ Completed' : '⏳ Pending'}</p>
                </div>
            `).join('');
        }
    }
}

function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    renderCalendar();
}

// ===== THEME MANAGEMENT =====
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    
    const themeIcon = document.querySelector('.theme-toggle i, .theme-toggle.floating i');
    if (themeIcon) {
        if (document.body.classList.contains('light-theme')) {
            themeIcon.className = 'fas fa-sun';
            const themeText = document.querySelector('.theme-toggle span');
            if (themeText) themeText.textContent = 'Light Mode';
        } else {
            themeIcon.className = 'fas fa-moon';
            const themeText = document.querySelector('.theme-toggle span');
            if (themeText) themeText.textContent = 'Dark Mode';
        }
    }
    
    localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        const themeIcon = document.querySelector('.theme-toggle i, .theme-toggle.floating i');
        if (themeIcon) {
            themeIcon.className = 'fas fa-sun';
        }
        const themeText = document.querySelector('.theme-toggle span');
        if (themeText) themeText.textContent = 'Light Mode';
    }
}

// ===== NAVIGATION =====
function switchPage(pageName) {
    currentPage = pageName;
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const selectedPage = document.getElementById(pageName);
    if (selectedPage) {
        selectedPage.classList.add('active');
    }
    
    // Update sidebar active state
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageName) {
            link.classList.add('active');
        }
    });
    
    // Render page-specific content
    if (pageName === 'calendar') {
        renderCalendar();
    } else if (pageName === 'progress') {
        updateUI();
    }
    
    renderCurrentPage();
}

function renderCurrentPage() {
    switch(currentPage) {
        case 'dashboard':
            updateUI();
            renderDeadlines();
            break;
        case 'planner':
            renderTasks();
            break;
        case 'progress':
            updateUI();
            break;
        case 'calendar':
            renderCalendar();
            break;
    }
}

// ===== NOTIFICATIONS =====
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'warning' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
        errorEl.textContent = message;
        setTimeout(() => errorEl.textContent = '', 3000);
    }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Sidebar navigation
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            if (page) switchPage(page);
        });
    });
    
    // Task form
    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
        taskForm.addEventListener('submit', handleTaskSubmit);
    }
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });
    
    // Sort select
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', renderTasks);
    }
    
    // Refresh quote
    const refreshQuote = document.getElementById('refreshQuote');
    if (refreshQuote) {
        refreshQuote.addEventListener('click', updateQuote);
    }
    
    // Calendar navigation
    const prevMonth = document.getElementById('prevMonth');
    const nextMonth = document.getElementById('nextMonth');
    if (prevMonth) prevMonth.addEventListener('click', () => changeMonth(-1));
    if (nextMonth) nextMonth.addEventListener('click', () => changeMonth(1));
}

function handleTaskSubmit(e) {
    e.preventDefault();
    
    const taskData = {
        subject: document.getElementById('subject').value,
        description: document.getElementById('taskDesc').value,
        deadline: document.getElementById('deadline').value,
        priority: document.getElementById('priority').value
    };
    
    const editId = document.getElementById('editId').value;
    
    if (editId) {
        updateTask(editId, taskData);
        document.getElementById('editId').value = '';
        document.getElementById('submitTaskBtn').innerHTML = '<i class="fas fa-plus"></i> Add Task';
    } else {
        addTask(taskData);
    }
    
    e.target.reset();
}

// Make functions globally available for onclick handlers
window.toggleTaskComplete = toggleTaskComplete;
window.editTask = editTask;
window.deleteTask = deleteTask;
window.selectDate = selectDate;