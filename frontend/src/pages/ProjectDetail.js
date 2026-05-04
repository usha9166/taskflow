import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import TaskModal from '../components/TaskModal';
import MemberModal from '../components/MemberModal';

const statusLabel = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
const statusColumns = ['todo', 'in_progress', 'review', 'done'];
const priorityDot = { low: 'var(--green)', medium: 'var(--blue)', high: 'var(--orange)', urgent: 'var(--red)' };

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('board'); // board | list
  const [filter, setFilter] = useState({ status: '', priority: '', assignee: '' });
  const [taskModal, setTaskModal] = useState(null); // null | 'new' | task object
  const [memberModal, setMemberModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const loadProject = useCallback(() => {
    return api.get(`/api/projects/${id}`).then(res => {
      setProject(res.data.project);
    });
  }, [id]);

  const loadTasks = useCallback(() => {
    const params = new URLSearchParams();
    if (filter.status) params.set('status', filter.status);
    if (filter.priority) params.set('priority', filter.priority);
    if (filter.assignee) params.set('assignee', filter.assignee);
    return api.get(`/api/projects/${id}/tasks?${params}`).then(res => setTasks(res.data.tasks));
  }, [id, filter]);

  useEffect(() => {
    Promise.all([loadProject(), loadTasks()]).finally(() => setLoading(false));
  }, [loadProject, loadTasks]);

  const handleDeleteProject = async () => {
    await api.delete(`/api/projects/${id}`);
    navigate('/projects');
  };

  const isAdmin = project?.my_role === 'admin';

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>;
  if (!project) return <div style={{ color: 'var(--text3)', padding: '2rem' }}>Project not found</div>;

  const tasksByStatus = {};
  statusColumns.forEach(s => { tasksByStatus[s] = tasks.filter(t => t.status === s); });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ color: 'var(--text3)', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
            <span style={{ cursor: 'pointer', color: 'var(--accent2)' }} onClick={() => navigate('/projects')}>Projects</span> /
          </div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>{project.name}</h2>
          {project.description && <p style={{ color: 'var(--text3)', fontSize: '0.88rem' }}>{project.description}</p>}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {project.members?.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width:20, height:20, borderRadius:'50%', background:'var(--accent-dim)', border:'1px solid var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', fontWeight:700, color:'var(--accent2)' }}>
                  {m.name?.[0]?.toUpperCase()}
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{m.name}</span>
                <span className={`badge badge-${m.role}`} style={{ fontSize:'0.65rem' }}>{m.role}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          {isAdmin && <button className="btn btn-ghost btn-sm" onClick={() => setMemberModal(true)}>+ Member</button>}
          <button className="btn btn-primary btn-sm" onClick={() => setTaskModal('new')}>+ Task</button>
          {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(true)}>Delete</button>}
        </div>
      </div>

      {/* Filters + view toggle */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          {['board','list'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '0.4rem 0.85rem', background: view === v ? 'var(--accent)' : 'transparent',
              color: view === v ? '#fff' : 'var(--text3)', fontSize: '0.82rem', border: 'none', cursor: 'pointer'
            }}>{v === 'board' ? '⊞ Board' : '≡ List'}</button>
          ))}
        </div>

        <select value={filter.status} onChange={e => setFilter(p => ({...p, status: e.target.value}))} style={{ width: 'auto', padding: '0.4rem 0.7rem', fontSize: '0.82rem' }}>
          <option value="">All Status</option>
          {statusColumns.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
        </select>
        <select value={filter.priority} onChange={e => setFilter(p => ({...p, priority: e.target.value}))} style={{ width: 'auto', padding: '0.4rem 0.7rem', fontSize: '0.82rem' }}>
          <option value="">All Priority</option>
          {['low','medium','high','urgent'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
        </select>
        <select value={filter.assignee} onChange={e => setFilter(p => ({...p, assignee: e.target.value}))} style={{ width: 'auto', padding: '0.4rem 0.7rem', fontSize: '0.82rem' }}>
          <option value="">All Assignees</option>
          {project.members?.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
        </select>
      </div>

      {/* Board view */}
      {view === 'board' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', overflowX: 'auto' }}>
          {statusColumns.map(status => (
            <div key={status} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', minHeight: 300 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className={`badge badge-${status}`}>{statusLabel[status]}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{tasksByStatus[status].length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {tasksByStatus[status].map(task => (
                  <TaskCard key={task.id} task={task} onClick={() => setTaskModal(task)} isAdmin={isAdmin} userId={user.id} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {tasks.length === 0 ? (
            <div className="empty-state"><h3>No tasks</h3><p>Create a task to get started</p></div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Task', 'Status', 'Priority', 'Assignee', 'Due Date'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text3)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id} onClick={() => setTaskModal(task)} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: priorityDot[task.priority], flexShrink: 0 }}/>
                        <span style={{ fontSize: '0.88rem' }}>{task.title}</span>
                        {task.is_overdue && <span className="badge badge-overdue" style={{ fontSize: '0.65rem' }}>overdue</span>}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}><span className={`badge badge-${task.status}`}>{statusLabel[task.status]}</span></td>
                    <td style={{ padding: '0.75rem 1rem' }}><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text2)' }}>{task.assignee?.name || '—'}</td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: task.is_overdue ? 'var(--red)' : 'var(--text3)' }}>
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Task Modal */}
      {taskModal && (
        <TaskModal
          task={taskModal === 'new' ? null : taskModal}
          projectId={id}
          members={project.members || []}
          isAdmin={isAdmin}
          userId={user.id}
          onClose={() => setTaskModal(null)}
          onSaved={() => { setTaskModal(null); loadTasks(); }}
          onDeleted={() => { setTaskModal(null); loadTasks(); }}
        />
      )}

      {/* Member Modal */}
      {memberModal && (
        <MemberModal
          projectId={id}
          members={project.members || []}
          onClose={() => setMemberModal(false)}
          onSaved={() => { setMemberModal(false); loadProject(); }}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 380 }}>
            <h3 className="modal-title" style={{ color: 'var(--red)' }}>Delete Project?</h3>
            <p style={{ color: 'var(--text2)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              This will permanently delete <strong>{project.name}</strong>, all its tasks and data. This cannot be undone.
            </p>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteProject}>Delete Forever</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, onClick, isAdmin, userId }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
      padding: '0.75rem', cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s'
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
        <span style={{ fontSize: '0.85rem', lineHeight: 1.4, flex: 1 }}>{task.title}</span>
        {task.is_overdue && <span style={{ fontSize: '0.65rem', color: 'var(--red)', marginLeft: '0.3rem' }}>!</span>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className={`badge badge-${task.priority}`}>{task.priority}</span>
        {task.assignee && (
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent2)' }}>
            {task.assignee.name?.[0]?.toUpperCase()}
          </div>
        )}
      </div>
      {task.due_date && (
        <div style={{ fontSize: '0.72rem', color: task.is_overdue ? 'var(--red)' : 'var(--text3)', marginTop: '0.35rem' }}>
          Due {new Date(task.due_date).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
