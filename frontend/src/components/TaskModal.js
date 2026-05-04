import React, { useState } from 'react';
import api from '../utils/api';

const statusLabel = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };

export default function TaskModal({ task, projectId, members, isAdmin, userId, onClose, onSaved, onDeleted }) {
  const isNew = !task;
  const canEdit = isAdmin || !task || task.created_by === userId || task.assignee_id === userId;
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    due_date: task?.due_date ? task.due_date.split('T')[0] : '',
    assignee_id: task?.assignee_id || ''
  });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [comments, setComments] = useState(task?.comments || []);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault(); setError(''); setSubmitting(true);
    try {
      const payload = { ...form, due_date: form.due_date || null, assignee_id: form.assignee_id || null };
      if (isNew) {
        await api.post(`/api/projects/${projectId}/tasks`, payload);
      } else {
        await api.put(`/api/projects/${projectId}/tasks/${task.id}`, payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save task');
    } finally { setSubmitting(false); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    const res = await api.post(`/api/projects/${projectId}/tasks/${task.id}/comments`, { content: comment });
    setComments(prev => [...prev, res.data.comment]);
    setComment('');
  };

  const handleDelete = async () => {
    await api.delete(`/api/projects/${projectId}/tasks/${task.id}`);
    onDeleted();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 className="modal-title" style={{ margin: 0 }}>{isNew ? 'New Task' : (canEdit ? 'Edit Task' : 'View Task')}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Title *</label>
            <input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))}
              placeholder="Task title" required disabled={!canEdit} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
              placeholder="Details..." disabled={!canEdit} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))} disabled={!canEdit}>
                {Object.entries(statusLabel).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select value={form.priority} onChange={e => setForm(p => ({...p, priority: e.target.value}))} disabled={!canEdit}>
                {['low','medium','high','urgent'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Assignee</label>
              <select value={form.assignee_id} onChange={e => setForm(p => ({...p, assignee_id: e.target.value}))} disabled={!isAdmin && !isNew}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm(p => ({...p, due_date: e.target.value}))} disabled={!canEdit} />
            </div>
          </div>
          {error && <div className="form-error" style={{ marginBottom: '0.75rem' }}>{error}</div>}
          <div className="form-actions">
            {!isNew && (isAdmin || task.created_by === userId) && (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(true)}>Delete</button>
            )}
            <div style={{ flex: 1 }}/>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            {canEdit && (
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <span className="spinner" style={{width:14,height:14}}/> : (isNew ? 'Create' : 'Save')}
              </button>
            )}
          </div>
        </form>

        {/* Comments */}
        {!isNew && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text2)', marginBottom: '0.75rem' }}>Comments</h4>
            {comments.length === 0 && <p style={{ color: 'var(--text3)', fontSize: '0.82rem', marginBottom: '0.75rem' }}>No comments yet</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {comments.map(c => (
                <div key={c.id} style={{ background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: '0.65rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent2)', marginBottom: '0.25rem', fontWeight: 600 }}>{c.user?.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{c.content}</div>
                </div>
              ))}
            </div>
            <form onSubmit={handleComment} style={{ display: 'flex', gap: '0.5rem' }}>
              <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..." style={{ flex: 1 }} />
              <button type="submit" className="btn btn-ghost btn-sm">Post</button>
            </form>
          </div>
        )}

        {deleteConfirm && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p style={{ color: 'var(--text2)', fontSize: '0.88rem', marginBottom: '0.75rem' }}>Delete this task permanently?</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirm(false)}>No</button>
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>Yes, Delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
