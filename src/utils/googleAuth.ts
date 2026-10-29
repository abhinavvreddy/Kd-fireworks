export const GOOGLE_CLIENT_ID =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
  '503314294383-sp456noia341bm8ombpmcbd5rqsi347v.apps.googleusercontent.com';

declare global {
  interface Window {
    google?: any;
  }
}
