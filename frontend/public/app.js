// ─────────────────────────────────────────
// CONFIG & STATE
// ─────────────────────────────────────────
const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : '/api';

let state = {
  token: localStorage.getItem('tf_token'),
  user: JSON.parse(localStorage.getItem('tf_user') || 'null'),
  currentProject: null,
  allTasks: [],
  projectMembers: [],
  allUsers: [],
  currentTaskId: null
};

// ─────────────────────────────────────────
// API HELPERS
// ─────────────────────────────────────────
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers: { ...headers, ...opts.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const get = path => api(path);
const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) });
const put = (path, body) => api(path, { method: 'PUT', body: JSON.stringify(body) });
const del = path => api(path, { method: 'DELETE' });

// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t, i) => t.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'signup')));
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('signup-form').classList.toggle('hidden', tab !== 'signup');
}

async function handleLogin(e) {
  e.preventDefault();
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');
  try {
    const data = await post('/auth/login', {
      email: document.getElementById('login-email').value,
      password: document.getElementById('login-password').value
    });
    loginSuccess(data);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const errEl = document.getElementById('signup-error');
  errEl.classList.add('hidden');
  try {
    const data = await post('/auth/signup', {
      name: document.getElementById('signup-name').value,
      email: document.getElementById('signup-email').value,
      password: document.getElementById('signup-password').value
    });
    loginSuccess(data);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

function loginSuccess({ token, user }) {
  state.token = token;
  state.user = user;
  localStorage.setItem('tf_token', token);
  localStorage.setItem('tf_user', JSON.stringify(user));
  showApp();
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('tf_token');
  localStorage.removeItem('tf_user');
  document.getElementById('auth-page').classList.remove('hidden');
  document.getElementById('main-page').classList.add('hidden');
}

// ─────────────────────────────────────────
// APP INIT
// ─────────────────────────────────────────
function showApp() {
  document.getElementById('auth-page').classList.add('hidden');
  document.getElementById('main-page').classList.remove('hidden');
  
  const u = state.user;
  document.getElementById('sidebar-avatar').textContent = u.name[0].toUpperCase();
  document.getElementById('sidebar-name').textContent = u.name;
  const roleBadge = document.getElementById('sidebar-role');
  roleBadge.textContent = u.role;
  roleBadge.className = `role-badge ${u.role}`;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('dashboard-greeting').textContent = `${greeting}, ${u.name.split(' ')[0]}!`;

  navigate('dashboard');
}

// ─────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────
function navigate(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  if (view === 'dashboard') {
    document.getElementById('view-dashboard').classList.remove('hidden');
    document.querySelectorAll('.nav-item')[0].classList.add('active');
    loadDashboard();
  } else if (view === 'projects') {
    document.getElementById('view-projects').classList.remove('hidden');
    document.querySelectorAll('.nav-item')[1].classList.add('active');
    loadProjects();
  } else if (view === 'my-tasks') {
    document.getElementById('view-my-tasks').classList.remove('hidden');
    document.querySelectorAll('.nav-item')[2].classList.add('active');
    loadMyTasks();
  }
}

// ─────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────
async function loadDashboard() {
  try {
    const data = await get('/dashboard');
    const s = data.stats;

    document.getElementById('stats-grid').innerHTML = `
      <div class="stat-card"><div class="stat-label">Projects</div><div class="stat-value">${s.total_projects}</div></div>
      <div class="stat-card todo"><div class="stat-label">To Do</div><div class="stat-value">${s.todo}</div></div>
      <div class="stat-card inprog"><div class="stat-label">In Progress</div><div class="stat-value">${s.in_progress}</div></div>
      <div class="stat-card done"><div class="stat-label">Done</div><div class="stat-value">${s.done}</div></div>
      <div class="stat-card overdue"><div class="stat-label">Overdue</div><div class="stat-value">${s.overdue}</div></div>
      <div class="stat-card"><div class="stat-label">My Tasks</div><div class="stat-value">${s.my_tasks}</div></div>
    `;

    renderMiniTasks('overdue-list', data.overdue_tasks, 'overdue');
    renderMiniTasks('my-tasks-list', data.my_tasks);
    renderMiniTasks('recent-list', data.recent_tasks);
  } catch (err) { console.error(err); }
}

function renderMiniTasks(elId, tasks, type = '') {
  const el = document.getElementById(elId);
  if (!tasks.length) { el.innerHTML = '<div class="empty-state">Nothing here</div>'; return; }
  el.innerHTML = tasks.map(t => `
    <div class="task-mini" onclick="openTaskDetail(${t.id}, ${t.project_id})" style="border-left-color:${statusColor(t.status)}">
      <div>
        <div class="tm-title">${esc(t.title)}</div>
        <div class="tm-project">${esc(t.project_name || '')}</div>
      </div>
      ${t.due_date ? `<div class="tm-due">${type === 'overdue' ? '⚠ ' : ''}${fmtDate(t.due_date)}</div>` : ''}
      <span class="badge status-${t.status}">${statusLabel(t.status)}</span>
    </div>
  `).join('');
}

// ─────────────────────────────────────────
// PROJECTS
// ─────────────────────────────────────────
async function loadProjects() {
  try {
    const projects = await get('/projects');
    const el = document.getElementById('projects-grid');
    if (!projects.length) {
      el.innerHTML = '<div class="empty-state" style="grid-column:1/-1;padding:40px">No projects yet. Create your first one!</div>';
      return;
    }
    el.innerHTML = projects.map(p => `
      <div class="project-card" onclick="openProject(${p.id})">
        <div class="pc-name">${esc(p.name)}</div>
        <div class="pc-desc">${esc(p.description || 'No description')}</div>
        <div class="pc-meta">
          <span class="pc-status ${p.status}">${p.status}</span>
          <span>👥 ${p.member_count}</span>
          <span>✓ ${p.task_count} tasks</span>
        </div>
      </div>
    `).join('');
  } catch (err) { console.error(err); }
}

async function createProject(e) {
  e.preventDefault();
  const errEl = document.getElementById('project-error');
  errEl.classList.add('hidden');
  try {
    await post('/projects', {
      name: document.getElementById('new-project-name').value,
      description: document.getElementById('new-project-desc').value
    });
    closeAllModals();
    document.getElementById('new-project-name').value = '';
    document.getElementById('new-project-desc').value = '';
    loadProjects();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

// ─────────────────────────────────────────
// PROJECT DETAIL
// ─────────────────────────────────────────
async function openProject(pid) {
  state.currentProject = pid;
  navigate('project-detail');
  document.getElementById('view-project-detail').classList.remove('hidden');
  document.querySelectorAll('.view').forEach(v => { if (v.id !== 'view-project-detail') v.classList.add('hidden'); });

  try {
    const [project, tasks, users] = await Promise.all([
      get(`/projects/${pid}`),
      get(`/projects/${pid}/tasks`),
      get('/users')
    ]);

    state.allTasks = tasks;
    state.projectMembers = project.members || [];
    state.allUsers = users;

    document.getElementById('project-detail-name').textContent = project.name;
    document.getElementById('project-detail-desc').textContent = project.description || '';

    const role = getUserProjectRole(project);
    const canManage = role === 'owner' || role === 'admin' || state.user.role === 'admin';
    document.getElementById('members-btn').style.display = canManage ? '' : 'none';

    renderKanban(tasks);
  } catch (err) { console.error(err); }
}

function getUserProjectRole(project) {
  if (project.owner_id === state.user.id) return 'owner';
  const m = (project.members || []).find(m => m.user_id === state.user.id);
  return m ? m.role : 'member';
}

function renderKanban(tasks, filter = 'all') {
  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  const groups = { todo: [], in_progress: [], done: [] };
  filtered.forEach(t => (groups[t.status] || []).push(t));

  Object.entries(groups).forEach(([status, list]) => {
    document.getElementById(`count-${status}`).textContent = list.length;
    document.getElementById(`tasks-${status}`).innerHTML = list.length
      ? list.map(t => renderTaskCard(t)).join('')
      : '<div class="empty-state" style="font-size:12px">No tasks</div>';
  });
}

function renderTaskCard(t) {
  const now = new Date();
  const due = t.due_date ? new Date(t.due_date) : null;
  let dueClass = '', dueText = '';
  if (due) {
    const diff = (due - now) / 86400000;
    dueText = fmtDate(t.due_date);
    dueClass = t.is_overdue ? 'overdue' : diff < 3 ? 'upcoming' : 'normal';
  }
  return `
    <div class="task-card" onclick="openTaskDetail(${t.id})">
      <div class="tc-title">${esc(t.title)}</div>
      <div class="tc-meta">
        <span class="priority-dot ${t.priority}" title="${t.priority} priority"></span>
        ${due ? `<span class="tc-due ${dueClass}">${dueText}</span>` : ''}
        ${t.assignee ? `<span class="tc-assignee">👤 ${esc(t.assignee.name.split(' ')[0])}</span>` : ''}
      </div>
    </div>`;
}

function filterTasks(status, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderKanban(state.allTasks, status);
}

// ─────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────
function openNewTaskModal() {
  document.getElementById('task-modal-title').textContent = 'New Task';
  document.getElementById('edit-task-id').value = '';
  document.getElementById('task-title').value = '';
  document.getElementById('task-desc').value = '';
  document.getElementById('task-priority').value = 'medium';
  document.getElementById('task-status').value = 'todo';
  document.getElementById('task-due').value = '';
  document.getElementById('task-submit-btn').textContent = 'Create Task';

  // Populate assignee
  const sel = document.getElementById('task-assignee');
  sel.innerHTML = '<option value="">Unassigned</option>';
  const projectMembers = state.projectMembers.map(m => m.user);
  // Also get project owner
  const allOptions = [...state.allUsers].filter(u => {
    if (!state.currentProject) return true;
    return state.projectMembers.some(m => m.user_id === u.id) || u.id === state.user.id;
  });
  allOptions.forEach(u => {
    const o = document.createElement('option');
    o.value = u.id;
    o.textContent = u.name;
    sel.appendChild(o);
  });

  openModal('new-task-modal');
}

async function submitTask(e) {
  e.preventDefault();
  const errEl = document.getElementById('task-error');
  errEl.classList.add('hidden');
  const tid = document.getElementById('edit-task-id').value;
  const body = {
    title: document.getElementById('task-title').value,
    description: document.getElementById('task-desc').value,
    priority: document.getElementById('task-priority').value,
    status: document.getElementById('task-status').value,
    assignee_id: document.getElementById('task-assignee').value || null,
    due_date: document.getElementById('task-due').value || null
  };
  try {
    if (tid) {
      await put(`/tasks/${tid}`, body);
    } else {
      await post(`/projects/${state.currentProject}/tasks`, body);
    }
    closeAllModals();
    refreshTasks();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

async function refreshTasks() {
  if (!state.currentProject) return;
  const tasks = await get(`/projects/${state.currentProject}/tasks`);
  state.allTasks = tasks;
  renderKanban(tasks);
}

async function openTaskDetail(tid, forceProjectId = null) {
  const pid = forceProjectId || state.currentProject;
  let task;
  if (state.allTasks.length && !forceProjectId) {
    task = state.allTasks.find(t => t.id === tid);
  }
  if (!task) {
    // Load from dashboard — need to navigate to project first
    if (forceProjectId) {
      await openProject(forceProjectId);
      task = state.allTasks.find(t => t.id === tid);
    }
  }
  if (!task) return;

  state.currentTaskId = tid;

  document.getElementById('td-title').textContent = task.title;
  document.getElementById('td-desc').textContent = task.description || 'No description';
  document.getElementById('td-badges').innerHTML = `
    <span class="badge status-${task.status}">${statusLabel(task.status)}</span>
    <span class="badge priority-${task.priority}">${task.priority} priority</span>
    ${task.is_overdue ? '<span class="badge" style="background:rgba(255,71,87,.15);color:var(--danger)">⚠ Overdue</span>' : ''}
  `;

  document.getElementById('td-info-grid').innerHTML = `
    <div class="td-info-item"><label>Assignee</label><span>${task.assignee ? task.assignee.name : 'Unassigned'}</span></div>
    <div class="td-info-item"><label>Due Date</label><span>${task.due_date ? fmtDate(task.due_date) : '—'}</span></div>
    <div class="td-info-item"><label>Created by</label><span>${task.creator ? task.creator.name : '—'}</span></div>
    <div class="td-info-item"><label>Project</label><span>${task.project_name || '—'}</span></div>
  `;

  document.getElementById('td-status-btns').innerHTML = ['todo', 'in_progress', 'done'].map(s => `
    <button class="status-btn ${task.status === s ? 'active-' + s : ''}" onclick="updateTaskStatus(${tid}, '${s}', this)">${statusLabel(s)}</button>
  `).join('');

  openModal('task-detail-modal');
}

async function updateTaskStatus(tid, status, btn) {
  try {
    await put(`/tasks/${tid}`, { status });
    document.querySelectorAll('.status-btn').forEach(b => {
      b.className = 'status-btn';
    });
    btn.className = `status-btn active-${status}`;
    // Update task in state
    const t = state.allTasks.find(t => t.id === tid);
    if (t) t.status = status;
    renderKanban(state.allTasks);
    // Refresh detail view badges
    openTaskDetail(tid);
  } catch (err) { alert(err.message); }
}

function editCurrentTask() {
  const task = state.allTasks.find(t => t.id === state.currentTaskId);
  if (!task) return;
  closeAllModals();
  
  document.getElementById('task-modal-title').textContent = 'Edit Task';
  document.getElementById('edit-task-id').value = task.id;
  document.getElementById('task-title').value = task.title;
  document.getElementById('task-desc').value = task.description || '';
  document.getElementById('task-priority').value = task.priority;
  document.getElementById('task-status').value = task.status;
  document.getElementById('task-due').value = task.due_date ? task.due_date.split('T')[0] : '';
  document.getElementById('task-submit-btn').textContent = 'Save Changes';

  const sel = document.getElementById('task-assignee');
  sel.innerHTML = '<option value="">Unassigned</option>';
  state.allUsers.forEach(u => {
    const o = document.createElement('option');
    o.value = u.id;
    o.textContent = u.name;
    if (task.assignee_id === u.id) o.selected = true;
    sel.appendChild(o);
  });

  openModal('new-task-modal');
}

async function deleteCurrentTask() {
  if (!confirm('Delete this task?')) return;
  try {
    await del(`/tasks/${state.currentTaskId}`);
    closeAllModals();
    refreshTasks();
  } catch (err) { alert(err.message); }
}

// ─────────────────────────────────────────
// MY TASKS
// ─────────────────────────────────────────
async function loadMyTasks() {
  try {
    const data = await get('/dashboard');
    const allMyTasks = data.my_tasks;
    const el = document.getElementById('my-tasks-full');
    if (!allMyTasks.length) {
      el.innerHTML = '<div class="empty-state" style="padding:40px">No tasks assigned to you yet.</div>';
      return;
    }
    el.innerHTML = allMyTasks.map(t => `
      <div class="task-row" onclick="openTaskDetail(${t.id}, ${t.project_id})">
        <div class="tr-status" style="background:${statusColor(t.status)}"></div>
        <div>
          <div class="tr-title">${esc(t.title)}</div>
          <div class="tr-project">${esc(t.project_name || '')}</div>
        </div>
        <span class="badge priority-${t.priority}">${t.priority}</span>
        <span class="badge status-${t.status}">${statusLabel(t.status)}</span>
        ${t.due_date ? `<span style="font-size:12px;color:${t.is_overdue ? 'var(--danger)' : 'var(--text2)'}">${fmtDate(t.due_date)}</span>` : '<span></span>'}
      </div>
    `).join('');
  } catch (err) { console.error(err); }
}

// ─────────────────────────────────────────
// MEMBERS
// ─────────────────────────────────────────
async function openMembersModal() {
  renderMembersList();
  openModal('members-modal');
}

function renderMembersList() {
  const el = document.getElementById('members-list');
  el.innerHTML = state.projectMembers.map(m => `
    <div class="member-row">
      <div class="m-avatar">${m.user.name[0].toUpperCase()}</div>
      <div class="m-info">
        <div class="m-name">${esc(m.user.name)} <span class="role-badge ${m.role}">${m.role}</span></div>
        <div class="m-email">${esc(m.user.email)}</div>
      </div>
      <button class="m-remove" onclick="removeMember(${m.user_id})" title="Remove">×</button>
    </div>
  `).join('');
}

async function addMember() {
  const errEl = document.getElementById('member-error');
  errEl.classList.add('hidden');
  const email = document.getElementById('member-email').value.trim();
  const role = document.getElementById('member-role').value;
  if (!email) return;
  try {
    const m = await post(`/projects/${state.currentProject}/members`, { email, role });
    state.projectMembers.push(m);
    document.getElementById('member-email').value = '';
    renderMembersList();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

async function removeMember(userId) {
  if (!confirm('Remove this member?')) return;
  try {
    await del(`/projects/${state.currentProject}/members/${userId}`);
    state.projectMembers = state.projectMembers.filter(m => m.user_id !== userId);
    renderMembersList();
  } catch (err) { alert(err.message); }
}

// ─────────────────────────────────────────
// MODALS
// ─────────────────────────────────────────
function openModal(id) {
  document.getElementById('modal-backdrop').classList.remove('hidden');
  document.getElementById(id).classList.remove('hidden');
}

function closeAllModals() {
  document.getElementById('modal-backdrop').classList.add('hidden');
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

// ─────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────
function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function statusLabel(s) {
  return { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }[s] || s;
}

function statusColor(s) {
  return { todo: 'var(--todo)', in_progress: 'var(--inprog)', done: 'var(--done)' }[s] || 'var(--text3)';
}

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
if (state.token && state.user) {
  showApp();
}
