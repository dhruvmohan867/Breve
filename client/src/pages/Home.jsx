import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import API from '../api/axios';
import VideoCard from '../components/VideoCard';

function VideoSkeleton() {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="skeleton skeleton-card" />
      <div style={{ padding: 12 }}>
        <div className="skeleton skeleton-text" />
        <div className="skeleton skeleton-text-sm" />
      </div>
    </div>
  );
}

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [facets, setFacets] = useState({ places: [], years: [] });
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('query') || '';
  const length = searchParams.get('length') || '';
  const place = searchParams.get('place') || '';
  const year = searchParams.get('year') || '';
  const week = searchParams.get('week') || '';

  useEffect(() => {
    API.get('/videos/facets')
      .then(({ data }) => setFacets({ places: data.data?.places || [], years: data.data?.years || [] }))
      .catch(() => {});
  }, []);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  const fetchVideos = useCallback((pageNum, append = false) => {
    const setter = append ? setLoadingMore : setLoading;
    setter(true);
    API.get('/videos', { params: { query, length, place, year, week, page: pageNum, limit: 12, sortBy: 'createdAt', sortType: 'desc' } })
      .then(({ data }) => {
        const docs = data.data?.docs || [];
        setVideos(prev => append ? [...prev, ...docs] : docs);
        setHasMore(data.data?.hasNextPage || false);
      })
      .catch(() => !append && setVideos([]))
      .finally(() => setter(false));
  }, [query, length, place, year, week]);

  useEffect(() => {
    setPage(1);
    fetchVideos(1);
  }, [query, length, place, year, week, fetchVideos]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchVideos(next, true);
  };

  return (
    <div>
      <div className="page-header">
        <h1>{query ? `Results for "${query}"` : 'Films'}</h1>
        <p>{query ? 'Films matching that title, maker, place, or description' : 'The longer films first, then the short clips.'}</p>
      </div>

      <div className="catalog-filters">
        <select className="form-control" value={length} onChange={(e) => setFilter('length', e.target.value)}>
          <option value="">Any length</option>
          <option value="under15">Under 15 seconds</option>
          <option value="mid">15 to 30 seconds</option>
          <option value="over30">Over 30 seconds</option>
        </select>
        <select className="form-control" value={place} onChange={(e) => setFilter('place', e.target.value)}>
          <option value="">Any place</option>
          {facets.places.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <select className="form-control" value={year} onChange={(e) => setFilter('year', e.target.value)}>
          <option value="">Any year</option>
          {facets.years.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <label className="catalog-week">
          <input type="checkbox" checked={week === 'current'} onChange={(e) => setFilter('week', e.target.checked ? 'current' : '')} />
          This week only
        </label>
      </div>

      {loading ? (
        <div className="video-grid">
          {[...Array(8)].map((_, i) => <VideoSkeleton key={i} />)}
        </div>
      ) : videos.length === 0 ? (
        <div className="empty-state">
          <h3>No films found</h3>
          <p>{query ? 'Try a different search term' : 'Nothing has been published yet.'}</p>
        </div>
      ) : (
        <>
          <div className="video-grid">
            {videos.map((v) => <VideoCard key={v._id} video={v} />)}
          </div>
          {hasMore && (
            <div className="load-more-wrap">
              <button className="load-more-btn" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
