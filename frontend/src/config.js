const getApiBaseUrl = () => {
  // Check injected build variable or any common Vite env variable
  let raw = '';

  try {
    if (typeof __VERCEL_BACKEND_URL__ !== 'undefined' && __VERCEL_BACKEND_URL__) {
      raw = __VERCEL_BACKEND_URL__;
    }
  } catch (_) {
    // fallback if global constant is not defined
  }

  if (!raw) {
    raw =
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_BACKEND_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.API_URL ||
      import.meta.env.BACKEND_URL ||
      '';
  }

  let url = (raw || '').trim();

  // If no env is configured, default to production Render server in deployed environments, or local Django in dev
  if (!url) {
    if (
      typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      url = 'https://virtual-interview-backend-0k64.onrender.com/api';
    } else {
      url = 'http://127.0.0.1:8000/api';
    }
  }

  // Remove any trailing slashes
  url = url.replace(/\/+$/, '');

  // Ensure it ends with /api since Django routes are grouped under /api/
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }

  // Browser-side check: warn if Mixed Content (HTTPS page trying to call HTTP backend)
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
    console.error(
      `[Virtual Interview API] ⚠️ Mixed Content Warning: Your site is on HTTPS (${window.location.origin}), but API URL is HTTP (${url}). Modern browsers block HTTP requests from HTTPS sites. Use an HTTPS backend URL.`
    );
  }

  return url;
};

export const API_BASE_URL = getApiBaseUrl();
