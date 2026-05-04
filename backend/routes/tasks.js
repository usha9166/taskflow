const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const db = require('../db/database');
const { authenticate, requireProjectRole } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// GET /api/projects/:projectId/tasks
router.get('/', authenticate, requireProjectRole(['admin','member']), (req, res) => {
  const { status, assignee, priority } = req.query;
  let tasks = db.get('tasks').filter({ project_id: req.params.projectId }).value();
  if (status) tasks = tasks.filter(t => t.status === status);
  if (assignee) tasks = tasks.filter(t => t.assignee_id === assignee);
  if (priority) tasks = tasks.filter(t => t.priority === priority);
  
  const enriched = tasks.map(task => {
    const assigneeUser = task.assignee_id ? db.get('users').find({ id: task.assignee_id }).value() : null;
    const creatorUser = db.get('users').find({ id: task.created_by }).value();
    return {
      ...task,
      assignee: assigneeUser ? { id: assigneeUser.id, name: assigneeUser.name, email: assigneeUser.email } : null,
      creator: creatorUser ? { id: creatorUser.id, name: creatorUser.name } : null,
      is_overdue: task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
    };
  });
  res.json({ tasks: enriched });
});

// POST /api/projects/:projectId/tasks
router.post('/', authenticate, requireProjectRole(['admin','member']), [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('description').optional().trim(),
  body('status').optional().isIn(['todo','in_progress','review','done']),
  body('priority').optional().isIn(['low','medium','high','urgent']),
  body('due_date').optional().isISO8601(),
  body('assignee_id').optional(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, status, priority, due_date, assignee_id } = req.body;

  // Validate assignee is in project
  if (assignee_id) {
    const isMember = db.get('project_members').find({ project_id: req.params.projectId, user_id: assignee_id }).value();
    if (!isMember) return res.status(400).json({ error: 'Assignee must be a project member' });
  }

  const task = {
    id: crypto.randomUUID(),
    project_id: req.params.projectId,
    title,
    description: description || '',
    status: status || 'todo',
    priority: priority || 'medium',
    due_date: due_date || null,
    assignee_id: assignee_id || null,
    created_by: req.user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.get('tasks').push(task).write();

  const assigneeUser = assignee_id ? db.get('users').find({ id: assignee_id }).value() : null;
  res.status(201).json({
    task: {
      ...task,
      assignee: assigneeUser ? { id: assigneeUser.id, name: assigneeUser.name, email: assigneeUser.email } : null,
      is_overdue: false
    }
  });
});

// GET /api/projects/:projectId/tasks/:taskId
router.get('/:taskId', authenticate, requireProjectRole(['admin','member']), (req, res) => {
  const task = db.get('tasks').find({ id: req.params.taskId, project_id: req.params.projectId }).value();
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const assigneeUser = task.assignee_id ? db.get('users').find({ id: task.assignee_id }).value() : null;
  const comments = db.get('comments').filter({ task_id: task.id }).value().map(c => {
    const u = db.get('users').find({ id: c.user_id }).value();
    return { ...c, user: { id: u?.id, name: u?.name } };
  });
  res.json({
    task: {
      ...task,
      assignee: assigneeUser ? { id: assigneeUser.id, name: assigneeUser.name } : null,
      comments,
      is_overdue: task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
    }
  });
});

// PUT /api/projects/:projectId/tasks/:taskId
router.put('/:taskId', authenticate, requireProjectRole(['admin','member']), [
  body('title').optional().trim().notEmpty(),
  body('status').optional().isIn(['todo','in_progress','review','done']),
  body('priority').optional().isIn(['low','medium','high','urgent']),
  body('due_date').optional({ nullable: true }).isISO8601(),
], (req, res) => {
  const task = db.get('tasks').find({ id: req.params.taskId, project_id: req.params.projectId }).value();
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Members can only update their assigned tasks or tasks they created
  if (req.membership.role === 'member' && task.created_by !== req.user.id && task.assignee_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only update tasks assigned to you or created by you' });
  }

  const allowed = ['title','description','status','priority','due_date','assignee_id'];
  const updates = { updated_at: new Date().toISOString() };
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  db.get('tasks').find({ id: req.params.taskId }).assign(updates).write();
  const updated = db.get('tasks').find({ id: req.params.taskId }).value();
  const assigneeUser = updated.assignee_id ? db.get('users').find({ id: updated.assignee_id }).value() : null;
  res.json({
    task: {
      ...updated,
      assignee: assigneeUser ? { id: assigneeUser.id, name: assigneeUser.name } : null,
      is_overdue: updated.due_date && new Date(updated.due_date) < new Date() && updated.status !== 'done'
    }
  });
});

// DELETE /api/projects/:projectId/tasks/:taskId
router.delete('/:taskId', authenticate, requireProjectRole(['admin','member']), (req, res) => {
  const task = db.get('tasks').find({ id: req.params.taskId, project_id: req.params.projectId }).value();
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (req.membership.role === 'member' && task.created_by !== req.user.id) {
    return res.status(403).json({ error: 'Only task creator or admin can delete' });
  }
  db.get('tasks').remove({ id: req.params.taskId }).write();
  db.get('comments').remove({ task_id: req.params.taskId }).write();
  res.json({ message: 'Task deleted' });
});

// POST /api/projects/:projectId/tasks/:taskId/comments
router.post('/:taskId/comments', authenticate, requireProjectRole(['admin','member']), [
  body('content').trim().notEmpty().withMessage('Comment cannot be empty'),
], (req, res) => {
  const task = db.get('tasks').find({ id: req.params.taskId, project_id: req.params.projectId }).value();
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const comment = { id: crypto.randomUUID(), task_id: req.params.taskId, user_id: req.user.id, content: req.body.content, created_at: new Date().toISOString() };
  db.get('comments').push(comment).write();
  res.status(201).json({ comment: { ...comment, user: { id: req.user.id, name: req.user.name } } });
});

module.exports = router;
