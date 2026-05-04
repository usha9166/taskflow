const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow_secret_key_change_in_prod';

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.get('users').find({ id: decoded.id }).value();
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireProjectRole = (roles) => (req, res, next) => {
  const { projectId } = req.params;
  const membership = db.get('project_members')
    .find({ project_id: projectId, user_id: req.user.id }).value();
  if (!membership || !roles.includes(membership.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  req.membership = membership;
  next();
};

module.exports = { authenticate, requireProjectRole, JWT_SECRET };
