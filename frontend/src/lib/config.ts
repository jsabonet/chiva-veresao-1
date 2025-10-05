// Use Vite's import.meta.env when available in the browser bundle.
// Fallback to window origin + /api for dev servers, or localhost if window is unavailable.
const viteBase = typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_BASE_URL;
const runtimeBase = typeof (globalThis as any)?.API_BASE_URL === 'string' ? (globalThis as any).API_BASE_URL : undefined;

export const API_BASE_URL =
	viteBase ||
	runtimeBase ||
	(typeof window !== 'undefined'
		? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}/api`
		: 'http://localhost:8000');