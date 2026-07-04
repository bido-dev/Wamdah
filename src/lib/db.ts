import fs from 'fs';
import path from 'path';

export interface Session {
  code: string;
  type: 'individual' | 'group';
  createdAt: number;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  linkUrl?: string;
  clientCount: number; // للتحقق من عدد الطلاب المتصلين في المجموعات
  status: 'waiting' | 'ready' | 'downloaded';
}

const DB_DIR = '/tmp/wamda';
const DB_FILE = path.join(DB_DIR, 'db.json');
const UPLOADS_DIR = path.join(DB_DIR, 'uploads');

// التأكد من تهيئة المجلدات
function initializeDb() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ sessions: [] }, null, 2));
  }
}

// قراءة الجلسات
function readSessions(): Session[] {
  initializeDb();
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data).sessions || [];
  } catch (error) {
    console.error('Error reading DB file:', error);
    return [];
  }
}

// كتابة الجلسات
function writeSessions(sessions: Session[]) {
  initializeDb();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify({ sessions }, null, 2));
  } catch (error) {
    console.error('Error writing DB file:', error);
  }
}

// توليد رمز فريد مكون من 6 خانات عشوائية
function generateUniqueCode(existingSessions: Session[]): string {
  let code = '';
  let isUnique = false;
  while (!isUnique) {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    isUnique = !existingSessions.some(s => s.code === code);
  }
  return code;
}

export const db = {
  // إنشاء جلسة جديدة
  createSession(type: 'individual' | 'group'): Session {
    // تنظيف الجلسات المنتهية الصلاحية أولاً
    this.cleanup();

    const sessions = readSessions();
    const code = generateUniqueCode(sessions);
    const newSession: Session = {
      code,
      type,
      createdAt: Date.now(),
      clientCount: 0,
      status: 'waiting',
    };

    sessions.push(newSession);
    writeSessions(sessions);
    return newSession;
  },

  // جلب جلسة بالرمز الخاص بها
  getSession(code: string): Session | null {
    this.cleanup();
    const sessions = readSessions();
    return sessions.find(s => s.code === code) || null;
  },

  // تحديث جلسة قائمة
  updateSession(code: string, updates: Partial<Session>): Session | null {
    const sessions = readSessions();
    const index = sessions.findIndex(s => s.code === code);
    if (index === -1) return null;

    sessions[index] = { ...sessions[index], ...updates };
    writeSessions(sessions);
    return sessions[index];
  },

  // حذف الجلسة والملفات التابعة لها فوراً
  deleteSession(code: string): boolean {
    const sessions = readSessions();
    const index = sessions.findIndex(s => s.code === code);
    if (index === -1) return false;

    const session = sessions[index];

    // حذف الملف المرتبط إذا كان موجوداً
    if (session.fileUrl) {
      const fileName = path.basename(session.fileUrl);
      const filePath = path.join(UPLOADS_DIR, fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error(`Failed to delete file: ${filePath}`, err);
        }
      }
    }

    sessions.splice(index, 1);
    writeSessions(sessions);
    return true;
  },

  // حفظ ملف مرفوع مؤقتاً
  saveFile(code: string, fileName: string, fileBuffer: Buffer, fileType: string, fileSize: number): string | null {
    initializeDb();
    const ext = path.extname(fileName);
    const uniqueFileName = `${code}_${Date.now()}${ext}`;
    const filePath = path.join(UPLOADS_DIR, uniqueFileName);

    try {
      fs.writeFileSync(filePath, fileBuffer);
      // سنقوم بإرجاع اسم الملف المميز
      return `/api/download?file=${uniqueFileName}&code=${code}`;
    } catch (error) {
      console.error('Error saving file:', error);
      return null;
    }
  },

  // مسار استرجاع الملف الفعلي
  getFilePath(fileName: string): string | null {
    initializeDb();
    const filePath = path.join(UPLOADS_DIR, fileName);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    return null;
  },

  // تنظيف تلقائي للجلسات التي مر عليها أكثر من 5 دقائق
  cleanup() {
    initializeDb();
    const sessions = readSessions();
    const now = Date.now();
    const expiryTime = 5 * 60 * 1000; // 5 دقائق

    const validSessions: Session[] = [];
    const expiredSessions: Session[] = [];

    sessions.forEach(s => {
      if (now - s.createdAt > expiryTime) {
        expiredSessions.push(s);
      } else {
        validSessions.push(s);
      }
    });

    if (expiredSessions.length > 0) {
      expiredSessions.forEach(session => {
        if (session.fileUrl) {
          const fileName = path.basename(session.fileUrl.split('?')[0].split('=').pop() || '');
          if (fileName) {
            const filePath = path.join(UPLOADS_DIR, fileName);
            if (fs.existsSync(filePath)) {
              try {
                fs.unlinkSync(filePath);
              } catch (err) {
                console.error(`Failed cleanup for file: ${filePath}`, err);
              }
            }
          }
        }
      });
      writeSessions(validSessions);
      console.log(`Cleaned up ${expiredSessions.length} expired sessions.`);
    }
  }
};
