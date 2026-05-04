# ⬡ TaskFlow — Team Task Manager

A full-stack team task management application with role-based access control, built with Node.js/Express backend and React frontend.

## Features

- **Authentication** — JWT-based signup/login
- **Projects** — Create, manage, delete projects
- **Team Management** — Invite members by email, assign Admin/Member roles
- **Tasks** — Create tasks with title, description, status, priority, due date, assignee
- **Kanban Board** — Drag-free board view with 4 columns (To Do → In Progress → Review → Done)
- **List View** — Table view with filters by status, priority, assignee
- **Dashboard** — Stats overview, recent activity, overdue alerts
- **Comments** — Add comments to tasks
- **RBAC** — Admins control full project; Members edit their own tasks

## Tech Stack

- **Backend**: Node.js, Express, lowdb (JSON file DB), JWT, bcrypt
- **Frontend**: React 18, React Router v6, Axios
- **Deployment**: Railway (single service)

## Local Development

### Backend
```bash
cd backend
npm install
node server.js
# Runs on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
REACT_APP_API_URL=http://localhost:5000 npm start
# Runs on http://localhost:3000
```

## Deploy to Railway

### Option A: GitHub + Railway Dashboard
1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo
4. Add environment variables:
   - `NODE_ENV=production`
   - `JWT_SECRET=your-secret-key-here`
   - `PORT=5000` (Railway sets this automatically)
5. Railway auto-detects nixpacks.toml and builds both frontend + backend
6. Visit your Railway URL — done!

### Option B: Railway CLI
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Set to `production` |
| `JWT_SECRET` | Yes | Secret key for JWT tokens (use a long random string) |
| `PORT` | Auto | Railway sets this automatically |

## API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Projects
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/projects` | Any | List my projects |
| POST | `/api/projects` | Any | Create project |
| GET | `/api/projects/:id` | Member+ | Get project details |
| PUT | `/api/projects/:id` | Admin | Update project |
| DELETE | `/api/projects/:id` | Admin | Delete project |
| POST | `/api/projects/:id/members` | Admin | Add member |
| PUT | `/api/projects/:id/members/:mid` | Admin | Change member role |
| DELETE | `/api/projects/:id/members/:mid` | Admin | Remove member |

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects/:id/tasks` | List tasks (filter: status, priority, assignee) |
| POST | `/api/projects/:id/tasks` | Create task |
| GET | `/api/projects/:id/tasks/:tid` | Get task |
| PUT | `/api/projects/:id/tasks/:tid` | Update task |
| DELETE | `/api/projects/:id/tasks/:tid` | Delete task |
| POST | `/api/projects/:id/tasks/:tid/comments` | Add comment |

### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard` | Stats, recent tasks, overdue tasks |

## Role Permissions

| Action | Admin | Member |
|--------|-------|--------|
| Create/delete project | ✅ | ❌ |
| Add/remove members | ✅ | ❌ |
| Change member roles | ✅ | ❌ |
| Create tasks | ✅ | ✅ |
| Edit any task | ✅ | ❌ |
| Edit own/assigned tasks | ✅ | ✅ |
| Delete any task | ✅ | ❌ |
| Delete own tasks | ✅ | ✅ |
| Add comments | ✅ | ✅ |

## Project Structure

```
taskflow/
├── backend/
│   ├── db/database.js       # lowdb setup
│   ├── middleware/auth.js   # JWT + RBAC middleware
│   ├── routes/
│   │   ├── auth.js
│   │   ├── projects.js
│   │   ├── tasks.js
│   │   └── dashboard.js
│   └── server.js
├── frontend/
│   └── src/
│       ├── context/AuthContext.js
│       ├── pages/ (Login, Signup, Dashboard, Projects, ProjectDetail)
│       ├── components/ (Layout, TaskModal, MemberModal)
│       └── utils/api.js
├── nixpacks.toml            # Railway build config
└── README.md
```
