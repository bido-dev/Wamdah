import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
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

    // إذا تم إرسال رابط
    if (linkUrl) {
      db.updateSession(code, {
        linkUrl: linkUrl,
        status: 'ready'
      });
      return NextResponse.json({ success: true, message: 'تم إرسال الرابط بنجاح' });
    }

    // إذا تم إرسال ملف
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = file.name;
      const fileType = file.type;
      const fileSize = file.size;

      // حفظ الملف محلياً واستخراج رابط التحميل
      const downloadUrl = db.saveFile(code, fileName, buffer, fileType, fileSize);
      if (!downloadUrl) {
        return NextResponse.json({ error: 'فشل حفظ الملف' }, { status: 500 });
      }

      db.updateSession(code, {
        fileUrl: downloadUrl,
        fileName: fileName,
        fileType: fileType,
        fileSize: fileSize,
        status: 'ready'
      });

      return NextResponse.json({ success: true, message: 'تم رفع الملف بنجاح' });
    }

    return NextResponse.json({ error: 'يجب توفير ملف أو رابط للإرسال' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST /api/upload:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء الرفع' }, { status: 500 });
  }
}
