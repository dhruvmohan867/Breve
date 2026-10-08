import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

function formatRuntime(seconds) {
  const total = Math.round(Number(seconds) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.round((total % 3600) / 60);
  if (hours > 0) return `${hours} hr ${minutes} min`;
  return `${minutes} min`;
}

function formatLength(seconds) {
  const total = Math.round(Number(seconds) || 0);
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return `${minutes}:${remain.toString().padStart(2, '0')}`;
}

function creditLine(film) {
  return [film.maker, film.place, film.year].filter(Boolean).join(' · ');
}

export default function Week() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/programs/current')
      .then(({ data }) => setProgram(data.data))
      .catch(() => setProgram(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const canEdit = user && (!program || program.owner?._id === user._id);

  return (
    <div className="bill">
      <div className="page-header">
        <h1>{program?.title || 'This week'}</h1>
        <p>{program?.note || 'No playlist has been posted for this week.'}</p>
      </div>

      {program && (
        <div className="bill-meta">
          <span>{formatRuntime(program.totalRuntime)}</span>
          <span>{program.filmCount} {program.filmCount === 1 ? 'film' : 'films'}</span>
        </div>
      )}

      {canEdit && (
        <div style={{ marginBottom: 22 }}>
          <Link to="/bill" className="btn btn-secondary btn-sm">
            {program ? 'Revise this week' : 'Post this week'}
          </Link>
        </div>
      )}

      {program?.films?.length > 0 && (
        <ol className="bill-list">
          {program.films.map((film) => (
            <li key={film._id}>
              <button className="bill-row" onClick={() => navigate(`/video/${film._id}`)}>
                <img src={film.thumbnail} alt="" />
                <span className="bill-index">{String(film.position).padStart(2, '0')}</span>
                <span className="bill-copy">
                  <span className="bill-title">{film.title}</span>
                  {creditLine(film) && <span className="bill-credit">{creditLine(film)}</span>}
                </span>
                <span className="bill-length">{formatLength(film.duration)}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
