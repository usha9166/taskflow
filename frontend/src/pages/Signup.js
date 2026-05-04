import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({}); setLoading(true);
    try {
      await signup(form.name, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        const mapped = {};
        data.errors.forEach(e => { mapped[e.path] = e.msg; });
        setErrors(mapped);
      } else {
        setErrors({ general: data?.error || 'Signup failed' });
      }
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
      backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(108,99,255,0.08) 0%, transparent 60%)'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--accent2)', marginBottom: '0.25rem' }}>⬡ TaskFlow</h1>
          <p style={{ color: 'var(--text3)', fontSize: '0.88rem' }}>Create your account</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input placeholder="Alice Johnson" value={form.name}
              onChange={e => setForm(p => ({...p, name: e.target.value}))} required />
            {errors.name && <div className="form-error">{errors.name}</div>}
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="you@example.com" value={form.email}
              onChange={e => setForm(p => ({...p, email: e.target.value}))} required />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="min. 6 characters" value={form.password}
              onChange={e => setForm(p => ({...p, password: e.target.value}))} required />
            {errors.password && <div className="form-error">{errors.password}</div>}
          </div>
          {errors.general && <div className="form-error" style={{ marginBottom: '1rem' }}>{errors.general}</div>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }} disabled={loading}>
            {loading ? <span className="spinner" style={{ width:16,height:16 }}/> : 'Create Account'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1.25rem', color: 'var(--text3)', fontSize: '0.85rem' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--accent2)', textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
