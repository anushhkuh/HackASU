// Minimal Canvas API client helper
// Usage: set REACT_APP_CANVAS_BASE_URL (e.g. https://your-institution.instructure.com)
// and REACT_APP_CANVAS_TOKEN in your environment or .env.local (do NOT commit).

// runtime-configurable Canvas client
let baseUrl = process.env.REACT_APP_CANVAS_BASE_URL || '';
let token = process.env.REACT_APP_CANVAS_TOKEN || '';
const useProxy = process.env.REACT_APP_CANVAS_USE_PROXY === 'true';

export function setConfig({ base_url, baseUrl: b, token: t }) {
  if (b) baseUrl = b;
  if (base_url) baseUrl = base_url;
  if (t) token = t;
}

export function getConfig() {
  return { baseUrl, token };
}

export function hasToken() {
  return Boolean(token && token.trim());
}

export function isProxyEnabled() {
  return Boolean(useProxy);
}

async function request(path, opts = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };

  // When using a local proxy, call the proxy endpoint which will attach the token server-side
  if (useProxy) {
    const proxyPath = `/api/canvas${path}`;
    const res = await fetch(proxyPath, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      const err = new Error(`Canvas proxy error: ${res.status} ${res.statusText} - ${text}`);
      err.status = res.status;
      throw err;
    }
    const txt = await res.text();
    try { return txt ? JSON.parse(txt) : null; } catch (e) { return txt; }
  }

  const resolvedBase = baseUrl || process.env.REACT_APP_CANVAS_BASE_URL || '';
  if (!resolvedBase) {
    const err = new Error('Canvas base URL is not configured. Set REACT_APP_CANVAS_BASE_URL or pass a base URL via the import UI.');
    throw err;
  }

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${resolvedBase}${path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Canvas API error: ${res.status} ${res.statusText} - ${text}`);
    err.status = res.status;
    throw err;
  }

  const txt = await res.text();
  try {
    return txt ? JSON.parse(txt) : null;
  } catch (e) {
    return txt;
  }
}

export async function getCourses() {
  return request('/api/v1/courses?per_page=100');
}

export async function getAssignmentsForCourse(courseId) {
  return request(`/api/v1/courses/${courseId}/assignments?per_page=100`);
}

export async function getCurrentUser() {
  return request('/api/v1/users/self/profile');
}

export default { setConfig, getConfig, hasToken, isProxyEnabled, getCourses, getAssignmentsForCourse, getCurrentUser };
