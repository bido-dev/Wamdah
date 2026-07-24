import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

// Consolidated API — all operations go through one serverless function
// Files are uploaded directly to Supabase Storage, bypassing Vercel payload limits

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit

// Allowed MIME type prefixes — broad categories for classroom use
const ALLOWED_MIME_PREFIXES = [
  'application/pdf',
  'application/vnd.',        // Office docs (docx, pptx, xlsx, etc.)
  'application/msword',
  'application/zip',
  'application/x-rar',
  'application/x-7z',
  'application/octet-stream',
  'application/json',
  'text/',
  'image/',
  'video/',
  'audio/',
];

function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_PREFIXES.some(prefix => mimeType.startsWith(prefix));
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // --- ACTION: create session ---
    if (action === 'create') {
      const body = await req.json();
      const { type } = body as { type: 'individual' | 'group' | 'dropbox' };

      if (!type || !['individual', 'group', 'dropbox'].includes(type)) {
        return NextResponse.json({ error: 'نوع الجلسة غير صالح' }, { status: 400 });
      }

      const session = await db.createSession(type);
      return NextResponse.json(session);
    }

    // --- ACTION: upload file or link ---
    if (action === 'upload') {
      const contentType = req.headers.get('content-type') || '';
      let code = '';
      let linkUrl: string | null = null;
      let file: File | null = null;
      let directFileUrl: string | null = null;
      let directFileName: string | null = null;
      let directFileType: string | null = null;
      let directFileSize: number | null = null;

      if (contentType.includes('application/json')) {
        const body = await req.json();
        code = body.code || '';
        linkUrl = body.link || null;
        directFileUrl = body.fileUrl || null;
        directFileName = body.fileName || null;
        directFileType = body.fileType || null;
        directFileSize = body.fileSize || null;
      } else {
        const formData = await req.formData();
        code = (formData.get('code') as string) || '';
        linkUrl = formData.get('link') as string;
        file = formData.get('file') as File | null;
      }

      if (!code) {
        return NextResponse.json({ error: 'رمز الاتصال مطلوب' }, { status: 400 });
      }

      // Validate PIN format — must be exactly 6 digits
      if (!/^\d{6}$/.test(code)) {
        return NextResponse.json({ error: 'صيغة الرمز غير صالحة' }, { status: 400 });
      }

      const session = await db.getSession(code);
      if (!session) {
        return NextResponse.json({ error: 'الجلسة غير موجودة أو انتهى وقتها' }, { status: 404 });
      }

      // If link was sent
      if (linkUrl) {
        // Validate URL format
        try {
          const parsed = new URL(linkUrl);
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            return NextResponse.json({ error: 'صيغة الرابط غير صالحة' }, { status: 400 });
          }
        } catch {
          return NextResponse.json({ error: 'صيغة الرابط غير صالحة' }, { status: 400 });
        }

        await db.updateSession(code, {
          linkUrl: linkUrl,
          status: 'ready',
        });
        return NextResponse.json({ success: true, message: 'تم إرسال الرابط بنجاح' });
      }

      // If direct uploaded file details were sent
      if (directFileUrl) {
        if (directFileType && !isAllowedMimeType(directFileType)) {
          return NextResponse.json(
            { error: 'نوع الملف غير مسموح به' },
            { status: 400 }
          );
        }
        if (directFileSize && directFileSize > MAX_FILE_SIZE) {
          return NextResponse.json(
            { error: 'حجم الملف يتجاوز الحد المسموح (50 ميجابايت)' },
            { status: 400 }
          );
        }

        if (session.type === 'dropbox') {
          await db.addSessionFile(code, {
            fileName: directFileName || 'file',
            fileType: directFileType || 'application/octet-stream',
            fileSize: directFileSize || 0,
            fileUrl: directFileUrl,
          });
        } else {
          await db.updateSession(code, {
            fileName: directFileName || 'file',
            fileType: directFileType || 'application/octet-stream',
            fileSize: directFileSize || 0,
            fileUrl: directFileUrl,
            status: 'ready',
          });
        }

        return NextResponse.json({ success: true, message: 'تم رفع الملف بنجاح' });
      }

      // If file was sent (fallback direct API upload) — upload to Supabase Storage
      if (file) {
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { error: 'حجم الملف يتجاوز الحد المسموح (50 ميجابايت)' },
            { status: 400 }
          );
        }

        // Validate MIME type
        if (!isAllowedMimeType(file.type)) {
          return NextResponse.json(
            { error: 'نوع الملف غير مسموح به' },
            { status: 400 }
          );
        }

        // Generate a unique filename to prevent path traversal and collisions
        const fileExt = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'bin';
        const uniqueName = `${crypto.randomUUID()}.${fileExt}`;
        const storagePath = `${code}/${uniqueName}`;

        const fileBuffer = Buffer.from(await file.arrayBuffer());

        // Upload to Supabase Storage bucket "uploads"
        const { error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(storagePath, fileBuffer, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error('Supabase storage upload error:', uploadError.message);
          return NextResponse.json(
            { error: 'فشل رفع الملف إلى التخزين السحابي' },
            { status: 500 }
          );
        }

        // Get the public URL for the uploaded file
        const { data: publicUrlData } = supabase.storage
          .from('uploads')
          .getPublicUrl(storagePath);

        if (session.type === 'dropbox') {
          await db.addSessionFile(code, {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileUrl: publicUrlData.publicUrl,
          });
        } else {
          await db.updateSession(code, {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileUrl: publicUrlData.publicUrl,
            status: 'ready',
          });
        }

        return NextResponse.json({ success: true, message: 'تم رفع الملف بنجاح' });
      }

      return NextResponse.json({ error: 'يجب توفير ملف أو رابط للإرسال' }, { status: 400 });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error) {
    console.error('API POST error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const code = searchParams.get('code');

    // --- ACTION: get session status ---
    if (action === 'status') {
      if (!code) {
        return NextResponse.json({ error: 'الرمز مطلوب' }, { status: 400 });
      }

      // Validate PIN format
      if (!/^\d{6}$/.test(code)) {
        return NextResponse.json({ error: 'صيغة الرمز غير صالحة' }, { status: 400 });
      }

      const join = searchParams.get('join') === 'true';
      const session = await db.getSession(code);

      if (!session) {
        return NextResponse.json({ error: 'الجلسة غير موجودة أو انتهت صلاحيتها' }, { status: 404 });
      }

      // If receiver is joining a group, increment client count
      if (join && session.type === 'group') {
        const updated = await db.updateSession(code, {
          clientCount: session.clientCount + 1,
        });
        return NextResponse.json(updated);
      }

      return NextResponse.json(session);
    }

    // --- ACTION: download file (redirect to Supabase Storage public URL) ---
    if (action === 'download') {
      if (!code) {
        return NextResponse.json({ error: 'معلمات غير صالحة' }, { status: 400 });
      }

      // Validate PIN format
      if (!/^\d{6}$/.test(code)) {
        return NextResponse.json({ error: 'صيغة الرمز غير صالحة' }, { status: 400 });
      }

      const session = await db.getSession(code);
      if (!session || !session.fileUrl) {
        return NextResponse.json({ error: 'الملف غير موجود أو انتهت صلاحية تحميله' }, { status: 404 });
      }

      // For individual sessions, clean up after download
      if (session.type === 'individual') {
        // Delete storage file and session record
        // TODO(security): Consider doing cleanup asynchronously to not block the response
        const filePathMatch = session.fileUrl.match(/uploads\/(.+)$/);
        if (filePathMatch) {
          await supabase.storage.from('uploads').remove([filePathMatch[1]]);
        }
        await db.deleteSession(code);
      }

      // Redirect to the Supabase Storage public URL
      return NextResponse.redirect(session.fileUrl);
    }

    // --- ACTION: get site statistics ---
    if (action === 'stats') {
      const { count: totalSessions } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true });

      const { count: fileSessions } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .not('file_url', 'is', null);

      const { count: linkSessions } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .not('link_url', 'is', null);

      return NextResponse.json({
        users: totalSessions ?? 0,
        files: fileSessions ?? 0,
        links: linkSessions ?? 0,
      });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });

  } catch (error) {
    console.error('API GET error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
