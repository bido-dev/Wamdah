import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST: إنشاء جلسة جديدة
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type } = body as { type: 'individual' | 'group' };

    if (!type || (type !== 'individual' && type !== 'group')) {
      return NextResponse.json({ error: 'نوع الجلسة غير صالح' }, { status: 400 });
    }

    const session = db.createSession(type);
    return NextResponse.json(session);
  } catch (error) {
    console.error('Error in POST /api/session:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إنشاء الجلسة' }, { status: 500 });
  }
}

// GET: الاستعلام عن حالة جلسة بالرمز
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const join = searchParams.get('join') === 'true';

    if (!code) {
      return NextResponse.json({ error: 'الرمز مطلوب' }, { status: 400 });
    }

    const session = db.getSession(code);
    if (!session) {
      return NextResponse.json({ error: 'الجلسة غير موجودة أو انتهت صلاحيتها' }, { status: 404 });
    }

    // إذا كان المستلم ينضم إلى مجموعة، نقوم بزيادة عدد المتصلين
    if (join && session.type === 'group') {
      const updated = db.updateSession(code, {
        clientCount: session.clientCount + 1
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error in GET /api/session:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب الجلسة' }, { status: 500 });
  }
}
