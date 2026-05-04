const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const db = require('../db/database');
const { authenticate, requireProjectRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/projects — list projects for user
router.get('/', authenticate, (req, res) => {
  const memberships = db.get('project_members').filter({ user_id: req.user.id }).value();
  const projectIds = memberships.map(m => m.project_id);
  const projects = db.get('projects').filter(p => projectIds.includes(p.id)).value();
  
  const enriched = projects.map(project => {
    const members = db.get('project_members').filter({ project_id: project.id }).value()
      .map(m => {
        const u = db.get('users').find({ id: m.user_id }).value();
        return { id: m.id, user_id: m.user_id, name: u?.name, email: u?.email, role: m.role };
      });
    const tasks = db.get('tasks').filter({ project_id: project.id }).value();
    const myRole = memberships.find(m => m.project_id === project.id)?.role;
    return { ...project, members, task_count: tasks.length, my_role: myRole };
  });

  res.json({ projects: enriched });
});

// POST /api/projects — create project
router.post('/', authenticate, [
  body('name').trim().notEmpty().withMessage('Project name required'),
  body('description').optional().trim(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description } = req.body;
  const project = {
    id: crypto.randomUUID(), name, description: description || '',
    owner_id: req.user.id, created_at: new Date().toISOString()
  };
  db.get('projects').push(project).write();

  // Creator is admin
  const membership = { id: crypto.randomUUID(), project_id: project.id, user_id: req.user.id, role: 'admin', joined_at: new Date().toISOString() };
  db.get('project_members').push(membership).write();

  res.status(201).json({ project: { ...project, my_role: 'admin', members: [] } });
});

// GET /api/projects/:projectId
router.get('/:projectId', authenticate, requireProjectRole(['admin','member']), (req, res) => {
  const project = db.get('projects').find({ id: req.params.projectId }).value();
  const members = db.get('project_members').filter({ project_id: project.id }).value()
    .map(m => {
      const u = db.get('users').find({ id: m.user_id }).value();
      return { id: m.id, user_id: m.user_id, name: u?.name, email: u?.email, role: m.role };
    });
  const tasks = db.get('tasks').filter({ project_id: project.id }).value();
  res.json({ project: { ...project, members, tasks, my_role: req.membership.role } });
});

// PUT /api/projects/:projectId
router.put('/:projectId', authenticate, requireProjectRole(['admin']), [
  body('name').optional().trim().notEmpty(),
], (req, res) => {
  const { name, description } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (description !== undefined) updates.description = description;
  db.get('projects').find({ id: req.params.projectId }).assign(updates).write();
  const project = db.get('projects').find({ id: req.params.projectId }).value();
  res.json({ project });
});

// DELETE /api/projects/:projectId
router.delete('/:projectId', authenticate, requireProjectRole(['admin']), (req, res) => {
  const pid = req.params.projectId;
  db.get('projects').remove({ id: pid }).write();
  db.get('project_members').remove({ project_id: pid }).write();
  db.get('tasks').remove({ project_id: pid }).write();
  res.json({ message: 'Project deleted' });
});

// POST /api/projects/:projectId/members — add member
router.post('/:projectId/members', authenticate, requireProjectRole(['admin']), [
  body('email').isEmail().normalizeEmail(),
  body('role').isIn(['admin','member']).withMessage('Role must be admin or member'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, role } = req.body;
  const user = db.get('users').find({ email }).value();
  if (!user) return res.status(404).json({ error: 'User not found. They must register first.' });

  const existing = db.get('project_members').find({ project_id: req.params.projectId, user_id: user.id }).value();
  if (existing) return res.status(409).json({ error: 'User already in project' });

  const membership = { id: crypto.randomUUID(), project_id: req.params.projectId, user_id: user.id, role, joined_at: new Date().toISOString() };
  db.get('project_members').push(membership).write();
  res.status(201).json({ member: { ...membership, name: user.name, email: user.email } });
});

// PUT /api/projects/:projectId/members/:memberId — change role
router.put('/:projectId/members/:memberId', authenticate, requireProjectRole(['admin']), [
  body('role').isIn(['admin','member']),
], (req, res) => {
  const { role } = req.body;
  const member = db.get('project_members').find({ id: req.params.memberId, project_id: req.params.projectId }).value();
  if (!member) return res.status(404).json({ error: 'Member not found' });
  if (member.user_id === req.user.id) return res.status(400).json({ error: 'Cannot change own role' });
  db.get('project_members').find({ id: req.params.memberId }).assign({ role }).write();
  res.json({ message: 'Role updated' });
});

// DELETE /api/projects/:projectId/members/:memberId
router.delete('/:projectId/members/:memberId', authenticate, requireProjectRole(['admin']), (req, res) => {
  const member = db.get('project_members').find({ id: req.params.memberId, project_id: req.params.projectId }).value();
  if (!member) return res.status(404).json({ error: 'Member not found' });
  if (member.user_id === req.user.id) return res.status(400).json({ error: 'Cannot remove yourself' });
  db.get('project_members').remove({ id: req.params.memberId }).write();
  res.json({ message: 'Member removed' });
});

module.exports = router;
