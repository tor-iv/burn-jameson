import { v4 as uuidv4 } from 'uuid';

export function generateSessionId(): string {
  const timestamp = Date.now();
  const random = uuidv4().split('-')[0];
  return `kh-${timestamp}-${random}`;
}

export function saveSession(sessionId: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('kh_current_session', sessionId);
  }
}

export function getSession(): string | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('kh_current_session');
  }
  return null;
}

export function clearSession(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('kh_current_session');
  }
}
