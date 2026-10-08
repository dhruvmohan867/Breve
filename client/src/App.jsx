import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Week from './pages/Week';
import Bill from './pages/Bill';
import Login from './pages/Login';
import Register from './pages/Register';
import Upload from './pages/Upload';
import VideoPlayer from './pages/VideoPlayer';
import Tweets from './pages/Tweets';
import Dashboard from './pages/Dashboard';
import LikedVideos from './pages/LikedVideos';
import History from './pages/History';
import Playlists from './pages/Playlists';
import PlaylistDetail from './pages/PlaylistDetail';
import Channel from './pages/Channel';
import Settings from './pages/Settings';
import Subscriptions from './pages/Subscriptions';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const authPages = ['/login', '/register'];
  const isAuthPage = authPages.includes(location.pathname);

  if (isAuthPage) {
    return <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>;
  }

  return (
    <>
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="main-layout">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/week" element={<Week />} />
            <Route path="/archive" element={<Navigate to="/" replace />} />
            <Route path="/bill" element={<RequireAuth><Bill /></RequireAuth>} />
            <Route path="/upload" element={<RequireAuth><Upload /></RequireAuth>} />
            <Route path="/video/:videoId" element={<VideoPlayer />} />
            <Route path="/tweets" element={<Tweets />} />
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/liked" element={<RequireAuth><LikedVideos /></RequireAuth>} />
            <Route path="/history" element={<RequireAuth><History /></RequireAuth>} />
            <Route path="/playlists" element={<Playlists />} />
            <Route path="/playlists/:playlistId" element={<PlaylistDetail />} />
            <Route path="/channel/:username" element={<Channel />} />
            <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
            <Route path="/subscriptions" element={<RequireAuth><Subscriptions /></RequireAuth>} />
          </Routes>
        </main>
      </div>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout />
        <Toaster position="bottom-right" toastOptions={{
          style: { background: '#0d0d1a', color: '#f0f0f5', border: '1px solid rgba(139,92,246,0.15)', boxShadow: '0 0 20px rgba(139,92,246,0.1)' }
        }} />
      </AuthProvider>
    </BrowserRouter>
  );
}
