import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { HiThumbUp, HiShare, HiBookmark, HiTrash, HiPencil, HiX, HiCheck } from 'react-icons/hi';

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  const i = [[31536000,'y'],[2592000,'mo'],[86400,'d'],[3600,'h'],[60,'m']];
  for (const [sec, l] of i) { const c = Math.floor(s / sec); if (c >= 1) return `${c}${l} ago`; }
  return 'Just now';
}

function getStreamableUrl(url) {
  if (!url) return '';
  return url.replace('/upload/', '/upload/f_mp4,vc_h264,q_auto/');
}

function SaveToPlaylistModal({ videoId, onClose }) {
  const [playlists, setPlaylists] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      API.get(`/playlists/user/${user._id}`)
        .then(({ data }) => setPlaylists(data.data || []))
        .catch(() => {});
    }
  }, [user]);

  const addToPlaylist = async (playlistId) => {
    try {
      await API.patch(`/playlists/add/${videoId}/${playlistId}`);
      toast.success('Added to playlist!');
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Save to Playlist</h3>
          <button className="btn-icon" onClick={onClose}><HiX /></button>
        </div>
        {playlists.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No playlists yet. Create one first!</p>
        ) : (
          playlists.map(p => (
            <div key={p._id} className="modal-playlist-item" onClick={() => addToPlaylist(p._id)}>
              <HiBookmark style={{ color: 'var(--accent-light)' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.totalVideos || 0} videos</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function VideoPlayer() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState('');
  const [credits, setCredits] = useState({ maker: '', place: '', year: '', rights: '' });
  const [savingCredits, setSavingCredits] = useState(false);
  const viewSent = useRef(false);

  useEffect(() => {
    viewSent.current = false;
    setLiked(false);
    setLikesCount(0);
    setSubscribed(false);
    setLoading(true);
    API.get(`/videos/${videoId}`)
      .then(({ data }) => {
        const next = data.data;
        setVideo(next);
        setLiked(Boolean(next?.isLiked));
        setLikesCount(next?.likesCount || 0);
        setSubscribed(Boolean(next?.isSubscribed));
        setCredits({
          maker: next?.maker || '',
          place: next?.place || '',
          year: next?.year || '',
          rights: next?.rights || ''
        });
      })
      .catch(() => toast.error('Video not found'))
      .finally(() => setLoading(false));

    API.get(`/comments/${videoId}?page=1&limit=50`)
      .then(({ data }) => setComments(data.data?.docs || []))
      .catch(() => {});

  }, [videoId]);

  const saveCredits = async (e) => {
    e.preventDefault();
    setSavingCredits(true);
    try {
      const { data } = await API.patch(`/videos/${videoId}`, credits);
      setVideo((current) => current ? { ...current, ...data.data } : current);
      toast.success('Credits saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save credits');
    } finally {
      setSavingCredits(false);
    }
  };

  const recordView = (watchedSeconds) => {
    if (viewSent.current) return;
    viewSent.current = true;
    API.post(`/videos/${videoId}/view`, { watchedSeconds })
      .then(({ data }) => {
        if (!data.data?.counted) {
          viewSent.current = false;
          return;
        }
        if (typeof data.data?.views === 'number') {
          setVideo((current) => current ? { ...current, views: data.data.views } : current);
        }
      })
      .catch(() => { viewSent.current = false; });
  };

  const onProgress = (event) => {
    if (viewSent.current) return;
    const watched = event.currentTarget.currentTime || 0;
    const duration = Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : Number(video?.duration);
    const needed = !duration || !Number.isFinite(duration) ? 30 : Math.min(30, duration * 0.25);
    if (watched >= needed) recordView(watched);
  };

  const toggleLike = async () => {
    if (!user) return toast.error('Please sign in');
    const previousLiked = liked;
    const previousCount = likesCount;
    setLiked(!previousLiked);
    setLikesCount(previousLiked ? Math.max(previousCount - 1, 0) : previousCount + 1);
    try {
      const { data } = await API.post(`/likes/toggle/v/${videoId}`);
      setLiked(data.data.liked);
      setLikesCount(data.data.likesCount);
    } catch {
      setLiked(previousLiked);
      setLikesCount(previousCount);
      toast.error('Failed');
    }
  };

  const toggleSubscribe = async () => {
    if (!user) return toast.error('Please sign in');
    try {
      const { data } = await API.post(`/subscriptions/c/${video.owner._id}`);
      setSubscribed(data.data.subscribed);
      toast.success(data.data.subscribed ? 'Subscribed!' : 'Unsubscribed');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!user) return toast.error('Please sign in');
    if (!commentText.trim()) return;
    try {
      const { data } = await API.post(`/comments/${videoId}`, { content: commentText });
      setComments([data.data, ...comments]);
      setCommentText('');
      toast.success('Comment added');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const deleteComment = async (id) => {
    try {
      await API.delete(`/comments/c/${id}`);
      setComments(comments.filter(c => c._id !== id));
      toast.success('Comment deleted');
    } catch { toast.error('Failed'); }
  };

  const updateComment = async (id) => {
    if (!editText.trim()) return;
    try {
      const { data } = await API.patch(`/comments/c/${id}`, { content: editText });
      setComments(comments.map(c => c._id === id ? { ...c, content: data.data.content } : c));
      setEditingComment(null);
      toast.success('Comment updated');
    } catch { toast.error('Failed'); }
  };

  const toggleCommentLike = async (id) => {
    if (!user) return toast.error('Please sign in');
    try {
      const { data } = await API.post(`/likes/toggle/c/${id}`);
      setComments(comments.map(c => c._id === id ? { ...c, likesCount: data.data.likesCount, isLiked: data.data.liked } : c));
    } catch { toast.error('Failed'); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied!');
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!video) return <div className="empty-state"><h3>Video not found</h3></div>;

  return (
    <div className="video-player-container">
      <div>
        <video controls autoPlay onTimeUpdate={onProgress} src={getStreamableUrl(video.videofile)} poster={video.thumbnail} style={{ width: '100%', borderRadius: 'var(--radius)', background: '#000', maxHeight: '70vh' }}>
          {video.captions && <track kind="captions" src={video.captions} srcLang="en" label="Captions" default />}
        </video>
        <div className="video-details">
          <h1>{video.title}</h1>
          {[video.maker, video.place, video.year].filter(Boolean).length > 0 && (
            <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              {[video.maker, video.place, video.year].filter(Boolean).join(' · ')}
            </p>
          )}
          {video.rights && (
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{video.rights}</p>
          )}
          <p style={{ margin: '8px 0 12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {[
              video.duration ? `${Math.floor(video.duration / 60)}:${Math.floor(video.duration % 60).toString().padStart(2, '0')}` : null,
              video.width && video.height ? `${video.width} x ${video.height}` : null,
              video.codec || null
            ].filter(Boolean).join(' · ')}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {video.views?.toLocaleString()} views • {timeAgo(video.createdAt)}
            </span>
            <div className="video-actions">
              <button className={`btn btn-sm ${liked ? 'btn-primary' : 'btn-secondary'}`} onClick={toggleLike}>
                <HiThumbUp /> {likesCount || 'Like'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={copyLink}><HiShare /> Share</button>
              <button className="btn btn-secondary btn-sm" onClick={() => user ? setShowSaveModal(true) : toast.error('Please sign in')}><HiBookmark /> Save</button>
            </div>
          </div>

          <div className="channel-bar">
            {video.owner?.avatar && <img src={video.owner.avatar} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => navigate(`/channel/${video.owner.username}`)} />}
            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => navigate(`/channel/${video.owner.username}`)}>
              <div className="channel-name">{video.owner?.fullname}</div>
              <div className="channel-subs">@{video.owner?.username}</div>
            </div>
            {user && video.owner?._id !== user._id && (
              <button className={`btn btn-sm ${subscribed ? 'btn-secondary' : 'btn-primary'}`} onClick={toggleSubscribe}>
                {subscribed ? 'Subscribed' : 'Subscribe'}
              </button>
            )}
          </div>

          {user && video.owner?._id === user._id && (
            <form onSubmit={saveCredits} style={{ marginTop: 12, padding: 16, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.8rem', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 10 }}>CREDITS</div>
              <div className="form-row">
                <input className="form-control" placeholder="Maker" maxLength={80} value={credits.maker} onChange={(e) => setCredits({ ...credits, maker: e.target.value })} />
                <input className="form-control" placeholder="Place" maxLength={80} value={credits.place} onChange={(e) => setCredits({ ...credits, place: e.target.value })} />
                <input className="form-control" placeholder="Year" inputMode="numeric" maxLength={4} value={credits.year} onChange={(e) => setCredits({ ...credits, year: e.target.value })} />
              </div>
              <input className="form-control" placeholder="Rights" maxLength={160} value={credits.rights} onChange={(e) => setCredits({ ...credits, rights: e.target.value })} style={{ marginTop: 10 }} />
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} disabled={savingCredits}>
                {savingCredits ? 'Saving...' : 'Save credits'}
              </button>
            </form>
          )}

          {video.description && (
            <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', marginTop: 12, fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              {video.description}
            </div>
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 16 }}>{comments.length} Comments</h3>
          {user && (
            <form className="comment-form" onSubmit={addComment}>
              <img src={user.avatar} alt="" className="comment-avatar" />
              <input className="form-control" placeholder="Add a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)} />
              <button className="btn btn-primary btn-sm" type="submit">Post</button>
            </form>
          )}
          {comments.map((c) => (
            <div key={c._id} className="comment">
              <img src={c.owner?.avatar || ''} alt="" className="comment-avatar" />
              <div className="comment-content">
                <div className="comment-header">
                  <span className="comment-user">@{c.owner?.username}</span>
                  <span className="comment-date">{timeAgo(c.createdAt)}</span>
                </div>
                {editingComment === c._id ? (
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <input className="form-control" value={editText} onChange={e => setEditText(e.target.value)} style={{ flex: 1, padding: '6px 10px', fontSize: '0.85rem' }} />
                    <button className="btn-icon" onClick={() => updateComment(c._id)} style={{ color: 'var(--success)' }}><HiCheck /></button>
                    <button className="btn-icon" onClick={() => setEditingComment(null)} style={{ color: 'var(--text-muted)' }}><HiX /></button>
                  </div>
                ) : (
                  <div className="comment-text">{c.content}</div>
                )}
                <div className="comment-actions">
                  <button className="btn-ghost btn-sm" onClick={() => toggleCommentLike(c._id)} style={{ fontSize: '0.8rem', padding: '4px 8px', color: c.isLiked ? 'var(--accent)' : 'var(--text-secondary)' }}>
                    <HiThumbUp style={{ marginRight: 4 }} /> {c.likesCount || 0}
                  </button>
                  {user && c.owner?._id === user._id && (
                    <>
                      <button className="btn-ghost btn-sm" onClick={() => { setEditingComment(c._id); setEditText(c.content); }} style={{ fontSize: '0.8rem', padding: '4px 8px' }}><HiPencil /> Edit</button>
                      <button className="btn-ghost btn-sm" onClick={() => deleteComment(c._id)} style={{ fontSize: '0.8rem', padding: '4px 8px', color: 'var(--danger)' }}><HiTrash /></button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>Next this week</h3>
        {video.nextInWeek ? (
          <button className="bill-row" onClick={() => navigate(`/video/${video.nextInWeek._id}`)}>
            <img src={video.nextInWeek.thumbnail} alt="" />
            <span className="bill-copy">
              <span className="bill-title">{video.nextInWeek.title}</span>
            </span>
          </button>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 18 }}>This film is not followed by another title in the week.</p>
        )}
        <h3 style={{ margin: '22px 0 12px', fontSize: '1rem' }}>Same place or year</h3>
        {(video.kin || []).length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No other film shares a place or year yet.</p>
        ) : (
          video.kin.map((item) => (
            <button key={item._id} className="bill-row" onClick={() => navigate(`/video/${item._id}`)}>
              <img src={item.thumbnail} alt="" />
              <span className="bill-copy">
                <span className="bill-title">{item.title}</span>
                <span className="bill-credit">{[item.place, item.year].filter(Boolean).join(' · ')}</span>
              </span>
            </button>
          ))
        )}
      </div>

      {showSaveModal && <SaveToPlaylistModal videoId={videoId} onClose={() => setShowSaveModal(false)} />}
    </div>
  );
}
