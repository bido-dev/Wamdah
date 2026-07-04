import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Consolidated API — all operations go through one serverless function
// This ensures in-memory sessions are shared between create/get/upload/download

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // --- ACTION: create session ---
    if (action === 'create') {
      const body = await req.json();
      const { type } = body as { type: 'individual' | 'group' };

      if (!type || (type !== 'individual' && type !== 'group')) {
        return NextResponse.json({ error: 'نوع الجلسة غير صالح' }, { status: 400 });
      }

      const session = db.createSession(type);
      return NextResponse.json(session);
    }

    // --- ACTION: upload file or link ---
    if (action === 'upload') {
      const formData = await req.formData();
      const code = formData.get('code') as string;
      const linkUrl = formData.get('link') as string;
      const file = formData.get('file') as File | null;

      if (!code) {
        return NextResponse.json({ error: 'رمز الاتصال مطلوب' }, { status: 400 });
      }

      const session = db.getSession(code);
      if (!session) {
        return NextResponse.json({ error: 'الجلسة غير موجودة أو انتهى وقتها' }, { status: 404 });
      }

      // If link was sent
      if (linkUrl) {
        db.updateSession(code, {
          linkUrl: linkUrl,
          status: 'ready',
        });
        return NextResponse.json({ success: true, message: 'تم إرسال الرابط بنجاح' });
      }

      // If file was sent — store as base64 in memory
      if (file) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64Data = buffer.toString('base64');

        db.updateSession(code, {
          fileData: base64Data,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileUrl: `/api/wamda?action=download&code=${code}`,
          status: 'ready',
        });

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

      const join = searchParams.get('join') === 'true';
      const session = db.getSession(code);

      if (!session) {
        return NextResponse.json({ error: 'الجلسة غير موجودة أو انتهت صلاحيتها' }, { status: 404 });
      }

      // If receiver is joining a group, increment client count
      if (join && session.type === 'group') {
        const updated = db.updateSession(code, {
          clientCount: session.clientCount + 1,
        });
        return NextResponse.json(updated);
      }

      // Don't expose fileData in status response
      const { fileData, ...safeSession } = session;
      return NextResponse.json(safeSession);
    }

    // --- ACTION: download file ---
    if (action === 'download') {
      if (!code) {
        return NextResponse.json({ error: 'معلمات غير صالحة' }, { status: 400 });
      }

      const session = db.getSession(code);
      if (!session || !session.fileData) {
        return NextResponse.json({ error: 'الملف غير موجود أو انتهت صلاحية تحميله' }, { status: 404 });
      }

      const fileBuffer = Buffer.from(session.fileData, 'base64');

      // For individual sessions, delete after download
      if (session.type === 'individual') {
        db.deleteSession(code);
      }

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': session.fileType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(session.fileName || 'file')}"`,
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error) {
    console.error('API GET error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
