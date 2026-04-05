import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { STUB_USER_ID } from '@/lib/assessment-builder-stub-user';

export const runtime = 'nodejs';

/** Soft-delete (archive): sets `deleted_at`. Dashboard filters these out. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const assessmentId = id?.trim();
    if (!assessmentId) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const res = await prisma.assessments.updateMany({
      where: {
        id: assessmentId,
        created_by: STUB_USER_ID,
        deleted_at: null,
      },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });

    if (res.count === 0) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[assessment-builder/assessments/[id]] DELETE', e);
    return NextResponse.json({ error: 'Archive failed' }, { status: 500 });
  }
}
