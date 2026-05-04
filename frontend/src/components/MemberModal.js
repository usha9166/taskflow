import React, { useState } from 'react';
import api from '../utils/api';

export default function MemberModal({ projectId, members, onClose, onSaved }) {
  const [form, setForm] = useState({ email: '', role: 'member' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault(); setError(''); setSubmitting(true);
    try {
      await api.post(`/api/projects/${projectId}/members`, form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member');
    } finally { setSubmitting(false); }
  };

  const handleChangeRole = async (memberId, role) => {
    await api.put(`/api/projects/${projectId}/members/${memberId}`, { role });
    onSaved();
  };

  const handleRemove = async (memberId) => {
    if (!window.confirm('Remove this member from the project?')) return;
    await api.delete(`/api/projects/${projectId}/members/${memberId}`);
    onSaved();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 className="modal-title" style={{ margin: 0 }}>Team Members</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
        </div>

        {/* Current members */}
        <div style={{ marginBottom: '1.5rem' }}>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent2)', flexShrink: 0 }}>
                {m.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{m.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{m.email}</div>
              </div>
              <select value={m.role} onChange={e => handleChangeRole(m.id, e.target.value)}
                style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.78rem' }}>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
              </select>
              <button className="btn btn-danger btn-sm" onClick={() => handleRemove(m.id)}>×</button>
            </div>
          ))}
        </div>

        {/* Add member */}
        <h4 style={{ fontSize: '0.9rem', color: 'var(--text2)', marginBottom: '0.75rem' }}>Add Member</h4>
        <form onSubmit={handleAdd}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input type="email" placeholder="member@email.com" value={form.email}
              onChange={e => setForm(p => ({...p, email: e.target.value}))} required style={{ flex: 1 }} />
            <select value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}
              style={{ width: 'auto', padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <div className="form-error" style={{ marginBottom: '0.5rem' }}>{error}</div>}
          <button type="submit" className="btn btn-primary btn-sm" disabled={submitting} style={{ width: '100%', justifyContent: 'center' }}>
            {submitting ? <span className="spinner" style={{width:14,height:14}}/> : 'Add Member'}
          </button>
        </form>
      </div>
    </div>
  );
}
