import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const statusLabel = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
const priorityColor = { low: 'var(--green)', medium: 'var(--blue)', high: 'var(--orange)', urgent: 'var(--red)' };

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/dashboard').then(res => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>;

  const { stats, recent_tasks, overdue_tasks } = data || {};

  const statCards = [
    { label: 'Projects', value: stats?.total_projects, color: 'var(--accent2)', icon: '◉' },
    { label: 'Total Tasks', value: stats?.total_tasks, color: 'var(--blue)', icon: '◈' },
    { label: 'My Tasks', value: stats?.my_tasks, color: 'var(--green)', icon: '◆' },
    { label: 'Overdue', value: stats?.overdue_tasks, color: 'var(--red)', icon: '◎' },
  ];

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>
          Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋
        </h2>
        <p style={{ color: 'var(--text3)', fontSize: '0.9rem' }}>Here's what's happening across your projects</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {statCards.map(s => (
          <div key={s.label} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'Syne,sans-serif', color: s.color }}>{s.value ?? 0}</div>
                <div style={{ color: 'var(--text3)', fontSize: '0.82rem', marginTop: '0.15rem' }}>{s.label}</div>
              </div>
              <span style={{ fontSize: '1.4rem', color: s.color, opacity: 0.6 }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Task status breakdown */}
      {stats && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text2)' }}>Tasks by Status</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {Object.entries(stats.tasks_by_status).map(([status, count]) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={`badge badge-${status}`}>{statusLabel[status]}</span>
                <span style={{ fontWeight: 700, fontFamily: 'Syne,sans-serif' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
        {/* Recent tasks */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text2)' }}>Recent Activity</h3>
          {recent_tasks?.length === 0 && <div className="empty-state" style={{ padding: '1.5rem' }}><p>No tasks yet</p></div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {recent_tasks?.slice(0,6).map(task => (
              <Link key={task.id} to={`/projects/${task.project_id}`} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg3)', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--border)'}
                  onMouseLeave={e => e.currentTarget.style.background='var(--bg3)'}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: priorityColor[task.priority] || 'var(--text3)', flexShrink: 0 }}/>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{task.project_name}</div>
                  </div>
                  <span className={`badge badge-${task.status}`}>{statusLabel[task.status]}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Overdue */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            ◎ Overdue Tasks {overdue_tasks?.length > 0 && <span className="badge badge-urgent">{overdue_tasks.length}</span>}
          </h3>
          {overdue_tasks?.length === 0 && <div className="empty-state" style={{ padding: '1.5rem' }}><p style={{ color: 'var(--green)' }}>✓ Nothing overdue!</p></div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {overdue_tasks?.slice(0,6).map(task => (
              <Link key={task.id} to={`/projects/${task.project_id}`} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{task.project_name} · Due {new Date(task.due_date).toLocaleDateString()}</div>
                  </div>
                  {task.assignee_name && <div style={{ fontSize: '0.72rem', color: 'var(--text3)', flexShrink: 0 }}>{task.assignee_name}</div>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
