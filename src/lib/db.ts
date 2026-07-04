// In-memory storage that persists within the same serverless function instance
// This replaces file-based /tmp storage for Vercel compatibility

export interface Session {
  code: string;
  type: 'individual' | 'group';
  createdAt: number;
  fileData?: string; // base64 encoded file data
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  linkUrl?: string;
  clientCount: number;
  status: 'waiting' | 'ready' | 'downloaded';
}

// Global in-memory store — shared across all handlers in the same function
const globalStore = globalThis as typeof globalThis & {
  __wamdaSessions?: Map<string, Session>;
};

if (!globalStore.__wamdaSessions) {
  globalStore.__wamdaSessions = new Map<string, Session>();
}

const sessions = globalStore.__wamdaSessions;

// Generate unique 6-digit code
function generateUniqueCode(): string {
  let code = '';
  let isUnique = false;
  while (!isUnique) {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    isUnique = !sessions.has(code);
  }
  return code;
}

// Cleanup expired sessions (older than 10 minutes)
function cleanup() {
  const now = Date.now();
  const expiryTime = 10 * 60 * 1000; // 10 minutes
  
  for (const [code, session] of sessions.entries()) {
    if (now - session.createdAt > expiryTime) {
      sessions.delete(code);
    }
  }
}

export const db = {
  createSession(type: 'individual' | 'group'): Session {
    cleanup();
    const code = generateUniqueCode();
    const newSession: Session = {
      code,
      type,
      createdAt: Date.now(),
      clientCount: 0,
      status: 'waiting',
    };
    sessions.set(code, newSession);
    return newSession;
  },

  getSession(code: string): Session | null {
    cleanup();
    return sessions.get(code) || null;
  },

  updateSession(code: string, updates: Partial<Session>): Session | null {
    const session = sessions.get(code);
    if (!session) return null;
    
    const updated = { ...session, ...updates };
    sessions.set(code, updated);
    return updated;
  },

  deleteSession(code: string): boolean {
    return sessions.delete(code);
  },
};
