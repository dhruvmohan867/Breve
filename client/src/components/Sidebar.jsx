import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiHome, HiHeart, HiClock, HiCollection, HiChatAlt2, HiChartBar, HiCog, HiUserGroup, HiFilm } from 'react-icons/hi';

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-label">Index</div>
        <NavLink to="/" end className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <HiHome /> Home
        </NavLink>
        <NavLink to="/week" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <HiFilm /> This week
        </NavLink>
        <NavLink to="/tweets" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <HiChatAlt2 /> Notes
        </NavLink>

        {user && (
          <>
            <div className="sidebar-divider" />
            <NavLink to="/subscriptions" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={onClose}>
              <HiUserGroup /> Subscriptions
            </NavLink>
            <NavLink to="/liked" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={onClose}>
              <HiHeart /> Liked Videos
            </NavLink>
            <NavLink to="/history" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={onClose}>
              <HiClock /> History
            </NavLink>
            <NavLink to="/playlists" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={onClose}>
              <HiCollection /> Playlists
            </NavLink>
            <div className="sidebar-divider" />
            <NavLink to="/dashboard" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={onClose}>
              <HiChartBar /> Dashboard
            </NavLink>
            <NavLink to={`/channel/${user.username}`} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={onClose}>
              <HiCog /> My Channel
            </NavLink>
          </>
        )}
      </aside>
    </>
  );
}
