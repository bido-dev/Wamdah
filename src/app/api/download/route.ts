import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get('file');
    const code = searchParams.get('code');

    if (!fileName || !code) {
      return NextResponse.json({ error: 'معلمات غير صالحة' }, { status: 400 });
    }

    const filePath = db.getFilePath(fileName);
    if (!filePath || !fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'الملف غير موجود أو انتهت صلاحية تحميله' }, { status: 404 });
    }

    const session = db.getSession(code);

    // قراءة الملف بالكامل في الذاكرة لتجنب أي مشاكل أثناء حذفه من القرص
    const fileBuffer = fs.readFileSync(filePath);

    // إذا كانت الجلسة فردية، نحذفها ونحذف الملف فوراً من قاعدة البيانات والقرص
    if (session && session.type === 'individual') {
      db.deleteSession(code);
    }

    // إرجاع الملف للتحميل
    const response = new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': session?.fileType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(session?.fileName || fileName)}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });

    return response;
  } catch (error) {
    console.error('Error in GET /api/download:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تحميل الملف' }, { status: 500 });
  }
}
