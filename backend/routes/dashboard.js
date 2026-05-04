const express = require('express');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard — global stats for user
router.get('/', authenticate, (req, res) => {
  const userId = req.user.id;
  const memberships = db.get('project_members').filter({ user_id: userId }).value();
  const projectIds = memberships.map(m => m.project_id);

  const allTasks = db.get('tasks').filter(t => projectIds.includes(t.project_id)).value();
  const myTasks = allTasks.filter(t => t.assignee_id === userId);
  const now = new Date();

  const stats = {
    total_projects: projectIds.length,
    total_tasks: allTasks.length,
    my_tasks: myTasks.length,
    tasks_by_status: {
      todo: allTasks.filter(t => t.status === 'todo').length,
      in_progress: allTasks.filter(t => t.status === 'in_progress').length,
      review: allTasks.filter(t => t.status === 'review').length,
      done: allTasks.filter(t => t.status === 'done').length,
    },
    overdue_tasks: allTasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done').length,
    my_overdue: myTasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done').length,
  };

  // Recent tasks (last 10)
  const recentTasks = allTasks
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 10)
    .map(task => {
      const project = db.get('projects').find({ id: task.project_id }).value();
      const assignee = task.assignee_id ? db.get('users').find({ id: task.assignee_id }).value() : null;
      return {
        ...task,
        project_name: project?.name,
        assignee_name: assignee?.name,
        is_overdue: task.due_date && new Date(task.due_date) < now && task.status !== 'done'
      };
    });

  // Overdue tasks detail
  const overdueTasks = allTasks
    .filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done')
    .map(task => {
      const project = db.get('projects').find({ id: task.project_id }).value();
      const assignee = task.assignee_id ? db.get('users').find({ id: task.assignee_id }).value() : null;
      return { ...task, project_name: project?.name, assignee_name: assignee?.name };
    });

  res.json({ stats, recent_tasks: recentTasks, overdue_tasks: overdueTasks });
});

module.exports = router;
