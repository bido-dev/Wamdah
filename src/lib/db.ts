import { supabase } from './supabase';
import crypto from 'crypto';

// Database row type matching the Supabase sessions table
export interface SessionRow {
  id: string;
  pin_code: string;
  session_type: 'RECEIVE' | 'GROUP';
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  link_url: string | null;
  client_count: number;
  status: 'waiting' | 'ready' | 'downloaded';
  created_at: string;
}

// Client-facing session type used by API responses and frontend components
export interface Session {
  code: string;
  type: 'individual' | 'group';
  createdAt: number;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  linkUrl?: string;
  clientCount: number;
  status: 'waiting' | 'ready' | 'downloaded';
}

// Map DB row to client-facing Session shape
function rowToSession(row: SessionRow): Session {
  return {
    code: row.pin_code,
    type: row.session_type === 'GROUP' ? 'group' : 'individual',
    createdAt: new Date(row.created_at).getTime(),
    fileUrl: row.file_url ?? undefined,
    fileName: row.file_name ?? undefined,
    fileType: row.file_type ?? undefined,
    fileSize: row.file_size ?? undefined,
    linkUrl: row.link_url ?? undefined,
    clientCount: row.client_count ?? 0,
    status: row.status,
  };
}

// Generate a cryptographically secure 6-digit PIN
function generateSecurePin(): string {
  // Use crypto.randomInt for uniform distribution in [100000, 999999]
  return crypto.randomInt(100000, 1000000).toString();
}

export const db = {
  async createSession(type: 'individual' | 'group'): Promise<Session> {
    const pin = generateSecurePin();
    const sessionType = type === 'group' ? 'GROUP' : 'RECEIVE';

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        pin_code: pin,
        session_type: sessionType,
        client_count: 0,
        status: 'waiting',
      })
      .select()
      .single();

    if (error) {
      // If PIN collision (unique constraint), retry once
      if (error.code === '23505') {
        const retryPin = generateSecurePin();
        const { data: retryData, error: retryError } = await supabase
          .from('sessions')
          .insert({
            pin_code: retryPin,
            session_type: sessionType,
            client_count: 0,
            status: 'waiting',
          })
          .select()
          .single();

        if (retryError) {
          throw new Error('فشل إنشاء الجلسة: ' + retryError.message);
        }
        return rowToSession(retryData as SessionRow);
      }
      throw new Error('فشل إنشاء الجلسة: ' + error.message);
    }

    return rowToSession(data as SessionRow);
  },

  async getSession(code: string): Promise<Session | null> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('pin_code', code)
      .single();

    if (error || !data) return null;
    return rowToSession(data as SessionRow);
  },

  async updateSession(code: string, updates: Partial<Session>): Promise<Session | null> {
    // Map client-facing field names to database column names
    const dbUpdates: Record<string, unknown> = {};

    if (updates.fileUrl !== undefined) dbUpdates.file_url = updates.fileUrl;
    if (updates.fileName !== undefined) dbUpdates.file_name = updates.fileName;
    if (updates.fileType !== undefined) dbUpdates.file_type = updates.fileType;
    if (updates.fileSize !== undefined) dbUpdates.file_size = updates.fileSize;
    if (updates.linkUrl !== undefined) dbUpdates.link_url = updates.linkUrl;
    if (updates.clientCount !== undefined) dbUpdates.client_count = updates.clientCount;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    const { data, error } = await supabase
      .from('sessions')
      .update(dbUpdates)
      .eq('pin_code', code)
      .select()
      .single();

    if (error || !data) return null;
    return rowToSession(data as SessionRow);
  },

  async deleteSession(code: string): Promise<boolean> {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('pin_code', code);

    return !error;
  },
};
