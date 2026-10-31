const BASE = 'http://localhost:8000';

async function request(method, path, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  };
  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw Object.assign(new Error(err.detail || 'Request failed'), {
      status: res.status,
      data: err,
    });
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),
};

// Auth
export const signup = (data) => api.post('/api/auth/signup', data);
export const login = (data) => api.post('/api/auth/login', data);
export const logout = () => api.post('/api/auth/logout');
export const getMe = () => api.get('/api/auth/me');

// Tags & Groups
export const getTags = () => api.get('/api/tags');
export const getGroups = () => api.get('/api/groups');
export const savePreferences = (data) => api.put('/api/me/preferences', data);

// Notices
export const getNotices = (params) =>
  api.get('/api/notices?' + new URLSearchParams(filterEmpty(params)));
export const getExplore = (params) =>
  api.get('/api/notices/explore?' + new URLSearchParams(filterEmpty(params)));
export const getNotice = (id) => api.get(`/api/notices/${id}`);
export const getCalendar = (month) => api.get(`/api/calendar?month=${month}`);

// Admin
export const adminGetNotices = (params) =>
  api.get('/api/admin/notices?' + new URLSearchParams(filterEmpty(params)));
export const adminCreateNotice = (data) => api.post('/api/admin/notices', data);
export const adminUpdateNotice = (id, data) => api.put(`/api/admin/notices/${id}`, data);
export const adminPublish = (id) => api.post(`/api/admin/notices/${id}/publish`);
export const adminUnpublish = (id) => api.post(`/api/admin/notices/${id}/unpublish`);
export const adminDeleteNotice = (id) => api.delete(`/api/admin/notices/${id}`);

// Saved
export const getSaved = () => api.get('/api/saved');
export const saveNotice = (id, data) => api.put(`/api/saved/${id}`, data);
export const unsaveNotice = (id) => api.delete(`/api/saved/${id}`);

function filterEmpty(params) {
  if (!params) return {};
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
}
