import { useNavigate } from 'react-router-dom';

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatViews(views) {
  if (!views) return '0 views';
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
  return `${views} views`;
}

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  const intervals = [
    [31536000, 'year'], [2592000, 'month'], [604800, 'week'],
    [86400, 'day'], [3600, 'hour'], [60, 'minute']
  ];
  for (const [secs, label] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count > 1 ? 's' : ''} ago`;
  }
  return 'Just now';
}

export default function VideoCard({ video }) {
  const navigate = useNavigate();

  return (
    <div className="card video-card" onClick={() => navigate(`/video/${video._id}`)}>
      <div className="thumbnail">
        <img src={video.thumbnail} alt={video.title} loading="lazy" />
        <span className="duration">{formatDuration(video.duration)}</span>
      </div>
      <div className="video-info">
        <div style={{ display: 'flex', gap: '10px' }}>
          {video.owner?.avatar && (
            <img src={video.owner.avatar} alt="" className="channel-avatar" />
          )}
          <div>
            <div className="video-title">{video.title}</div>
            {video.match && <div className="video-match">{video.match}</div>}
            <div className="video-meta">
              <span>{video.owner?.username || 'Unknown'}</span>
              <span>•</span>
              <span>{formatViews(video.views)}</span>
              <span>•</span>
              <span>{timeAgo(video.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
