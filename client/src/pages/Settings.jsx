import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiUser, HiLockClosed, HiPhotograph } from 'react-icons/hi';

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ fullname: user?.fullname || '', email: user?.email || '' });
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [saving, setSaving] = useState({});

  if (!user) return <div className="empty-state"><h3>Please sign in</h3></div>;

  const updateProfile = async (e) => {
    e.preventDefault();
    setSaving(s => ({ ...s, profile: true }));
    try {
      const { data } = await API.patch('/users/update-account', profile);
      setUser(data.data);
      toast.success('Profile updated');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(s => ({ ...s, profile: false })); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword.length < 8) return toast.error('Min 8 characters');
    setSaving(s => ({ ...s, password: true }));
    try {
      await API.post('/users/change-password', passwords);
      setPasswords({ oldPassword: '', newPassword: '' });
      toast.success('Password changed. Sign in again.');
      await logout();
      navigate('/login');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(s => ({ ...s, password: false })); }
  };

  const updateAvatar = async () => {
    if (!avatarFile) return;
    setSaving(s => ({ ...s, avatar: true }));
    const fd = new FormData(); fd.append('avatar', avatarFile);
    try {
      const { data } = await API.patch('/users/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUser(data.data);
      setAvatarFile(null);
      toast.success('Avatar updated');
    } catch { toast.error('Failed'); }
    finally { setSaving(s => ({ ...s, avatar: false })); }
  };

  const updateCover = async () => {
    if (!coverFile) return;
    setSaving(s => ({ ...s, cover: true }));
    const fd = new FormData(); fd.append('coverImage', coverFile);
    try {
      const { data } = await API.patch('/users/cover-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUser(data.data);
      setCoverFile(null);
      toast.success('Cover updated');
    } catch { toast.error('Failed'); }
    finally { setSaving(s => ({ ...s, cover: false })); }
  };

  return (
    <div style={{ maxWidth: 650, margin: '0 auto' }}>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your account and preferences</p>
      </div>

      <div className="settings-section">
        <h3><HiPhotograph style={{ verticalAlign: 'middle', marginRight: 8 }} />Profile Images</h3>
        <div className="settings-avatar-wrap">
          <img src={user.avatar} alt="" className="settings-avatar" />
          <div style={{ flex: 1 }}>
            <div className="file-upload" style={{ padding: 16, marginBottom: 8 }}>
              <input type="file" accept="image/*" onChange={e => setAvatarFile(e.target.files[0])} />
              <div className="file-text">{avatarFile ? `✓ ${avatarFile.name}` : 'Change avatar'}</div>
            </div>
            {avatarFile && <button className="btn btn-primary btn-sm" onClick={updateAvatar} disabled={saving.avatar}>{saving.avatar ? 'Saving...' : 'Save Avatar'}</button>}
          </div>
        </div>
        <div className="file-upload" style={{ padding: 16 }}>
          <input type="file" accept="image/*" onChange={e => setCoverFile(e.target.files[0])} />
          <div className="file-text">{coverFile ? `✓ ${coverFile.name}` : 'Change cover image'}</div>
        </div>
        {coverFile && <button className="btn btn-primary btn-sm" onClick={updateCover} disabled={saving.cover} style={{ marginTop: 10 }}>{saving.cover ? 'Saving...' : 'Save Cover'}</button>}
      </div>

      <form className="settings-section" onSubmit={updateProfile}>
        <h3><HiUser style={{ verticalAlign: 'middle', marginRight: 8 }} />Profile Details</h3>
        <div className="form-group">
          <label>Full Name</label>
          <input className="form-control" value={profile.fullname} onChange={e => setProfile({ ...profile, fullname: e.target.value })} required />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input className="form-control" type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} required />
        </div>
        <button className="btn btn-primary btn-sm" disabled={saving.profile}>{saving.profile ? 'Saving...' : 'Update Profile'}</button>
      </form>

      <form className="settings-section" onSubmit={changePassword}>
        <h3><HiLockClosed style={{ verticalAlign: 'middle', marginRight: 8 }} />Change Password</h3>
        <div className="form-group">
          <label>Current Password</label>
          <input className="form-control" type="password" value={passwords.oldPassword} onChange={e => setPasswords({ ...passwords, oldPassword: e.target.value })} required />
        </div>
        <div className="form-group">
          <label>New Password</label>
          <input className="form-control" type="password" placeholder="Min 8 characters" value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} required minLength={8} />
        </div>
        <button className="btn btn-primary btn-sm" disabled={saving.password}>{saving.password ? 'Saving...' : 'Change Password'}</button>
      </form>
    </div>
  );
}
