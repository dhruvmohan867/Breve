import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function formatLength(seconds) {
  const total = Math.round(Number(seconds) || 0);
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return `${minutes}:${remain.toString().padStart(2, '0')}`;
}

export default function Bill() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [films, setFilms] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    API.get('/programs/current')
      .then(({ data }) => {
        const program = data.data;
        if (!program) return;
        const mine = user && program.owner?._id === user._id;
        if (!mine) {
          setLocked(true);
          return;
        }
        setTitle(program.title || '');
        setNote(program.note || '');
        setFilms(program.films || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (locked) return;
    const handle = setTimeout(() => {
      API.get('/videos', { params: { query, page: 1, limit: 8, sortBy: 'createdAt', sortType: 'desc' } })
        .then(({ data }) => setResults(data.data?.docs || []))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, locked]);

  const addFilm = (film) => {
    if (films.some((item) => item._id === film._id)) return;
    if (films.length >= 8) {
      toast.error('A program holds at most 8 films');
      return;
    }
    setFilms((current) => [...current, film]);
  };

  const move = (index, direction) => {
    const next = index + direction;
    if (next < 0 || next >= films.length) return;
    const copy = [...films];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    setFilms(copy);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post('/programs', {
        title,
        note,
        videoIds: films.map((film) => film._id)
      });
      toast.success('Program posted');
      navigate('/week');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not post the program');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  if (locked) {
    return (
      <div className="empty-state">
        <h3>This week's program is already posted</h3>
        <p>Only the person who posted it can revise the bill.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="page-header">
        <h1>The bill</h1>
        <p>Choose up to eight films from the home page and put them in the order they should play this week.</p>
      </div>

      <form onSubmit={save}>
        <div className="form-group">
          <label>Title</label>
          <input className="form-control" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Note</label>
          <textarea className="form-control" maxLength={280} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <ol className="bill-list" style={{ marginBottom: 28 }}>
          {films.map((film, index) => (
            <li key={film._id} className="bill-edit-row">
              <img src={film.thumbnail} alt="" />
              <span className="bill-copy">
                <span className="bill-title">{film.title}</span>
                <span className="bill-credit">{formatLength(film.duration)}</span>
              </span>
              <span className="bill-edit-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => move(index, -1)}>Up</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => move(index, 1)}>Down</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFilms(films.filter((item) => item._id !== film._id))}>Remove</button>
              </span>
            </li>
          ))}
        </ol>

        <div className="form-group">
          <label>Add a film</label>
          <input className="form-control" placeholder="Search by title" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="bill-search">
          {results.map((film) => (
            <button type="button" key={film._id} className="bill-search-row" onClick={() => addFilm(film)}>
              <img src={film.thumbnail} alt="" />
              <span>{film.title}</span>
            </button>
          ))}
        </div>

        <button className="btn btn-primary" disabled={saving || films.length === 0}>
          {saving ? 'Posting...' : 'Post this program'}
        </button>
      </form>
    </div>
  );
}
