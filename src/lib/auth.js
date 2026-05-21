import Cookies from 'js-cookie';

const AUTH_COOKIE_KEY = 'navivibe_auth';
const COOKIE_OPTIONS = {
  expires: 30, // 30 days
  secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
  sameSite: 'strict',
  path: '/'
};

export const authCookies = {
  set(credentials) {
    Cookies.set(AUTH_COOKIE_KEY, JSON.stringify(credentials), COOKIE_OPTIONS);
  },
  
  get() {
    const data = Cookies.get(AUTH_COOKIE_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  },
  
  remove() {
    Cookies.remove(AUTH_COOKIE_KEY, { path: '/' });
  },

  exists() {
    return !!Cookies.get(AUTH_COOKIE_KEY);
  }
};
