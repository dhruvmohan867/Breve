import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { HiUser, HiMail, HiLockClosed, HiUpload, HiArrowRight, HiAtSymbol } from 'react-icons/hi';

export default function Register() {
  const [form, setForm] = useState({ fullname: '', email: '', username: '', password: '' });
  const [avatar, setAvatar] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!avatar) return toast.error('Avatar is required');
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('avatar', avatar);
      if (coverImage) fd.append('coverImage', coverImage);
      await register(fd);
      toast.success('Account created! Please sign in.');
      navigate('/login');
    } catch (err) {
      const fieldError = err.response?.data?.errors?.[0]?.msg;
      toast.error(fieldError || err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />
      <div className="auth-grid" />

      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-logo">▶ Breve</div>
        <h1>Create Account</h1>
        <p className="auth-subtitle">Join the community and start sharing</p>

        <form onSubmit={handleSubmit}>
          <div className="auth-row">
            <div className="form-group">
              <label><HiUser style={{ verticalAlign: 'middle', marginRight: 6 }} />Full Name</label>
              <input className="form-control" placeholder="John Doe"
                value={form.fullname} onChange={(e) => setForm({ ...form, fullname: e.target.value })} required />
            </div>
            <div className="form-group">
              <label><HiAtSymbol style={{ verticalAlign: 'middle', marginRight: 6 }} />Username</label>
              <input className="form-control" placeholder="johndoe123"
                value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </div>
          </div>

          <div className="form-group">
            <label><HiMail style={{ verticalAlign: 'middle', marginRight: 6 }} />Email</label>
            <input className="form-control" type="email" placeholder="you@example.com"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>

          <div className="form-group">
            <label><HiLockClosed style={{ verticalAlign: 'middle', marginRight: 6 }} />Password</label>
            <input className="form-control" type="password" placeholder="Minimum 8 characters" minLength={8}
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            {form.password.length > 0 && (
              <div style={{
                marginTop: 6, fontSize: '0.75rem', fontWeight: 500,
                color: form.password.length >= 8 ? '#10b981' : '#f59e0b'
              }}>
                {form.password.length >= 8 ? '✓ Strong enough' : `${8 - form.password.length} more characters needed`}
              </div>
            )}
          </div>

          <div className="auth-row" style={{ marginBottom: 8 }}>
            <div className="form-group">
              <label>Avatar *</label>
              <div className="file-upload">
                <input type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files[0])} />
                <div className="file-icon"><HiUpload /></div>
                <div className="file-text">{avatar ? '' : 'Profile photo'}</div>
                {avatar && <div className="file-name">✓ {avatar.name}</div>}
              </div>
            </div>
            <div className="form-group">
              <label>Cover Image</label>
              <div className="file-upload">
                <input type="file" accept="image/*" onChange={(e) => setCoverImage(e.target.files[0])} />
                <div className="file-icon"><HiUpload /></div>
                <div className="file-text">{coverImage ? '' : 'Optional banner'}</div>
                {coverImage && <div className="file-name">✓ {coverImage.name}</div>}
              </div>
            </div>
          </div>

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Creating account...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                Create Account <HiArrowRight />
              </span>
            )}
          </button>
        </form>

        <div className="auth-divider">or</div>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
