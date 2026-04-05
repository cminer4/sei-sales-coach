import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { STUB_USER_ID } from '@/lib/assessment-builder-stub-user';

export const runtime = 'nodejs';

function parseStakeholders(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out = raw
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean);
  return out;
}

/** Update brief and stakeholders (stub user only). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const assessmentId = id?.trim();
    if (!assessmentId) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    let body: { projectBrief?: string | null; stakeholders?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const hasBrief = body.projectBrief !== undefined;
    const hasStk = body.stakeholders !== undefined;
    if (!hasBrief && !hasStk) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const data: { project_brief?: string | null; stakeholders?: string[]; updated_at: Date } = {
      updated_at: new Date(),
    };
    if (hasBrief) {
      if (body.projectBrief !== null && typeof body.projectBrief !== 'string') {
        return NextResponse.json({ error: 'projectBrief must be string or null' }, { status: 400 });
      }
      data.project_brief =
        body.projectBrief === null ? null : body.projectBrief.trim() || null;
    }
    if (hasStk) {
      const st = parseStakeholders(body.stakeholders);
      if (st === null) {
        return NextResponse.json({ error: 'stakeholders must be a JSON array of strings' }, { status: 400 });
      }
      data.stakeholders = st;
    }

    const res = await prisma.assessments.updateMany({
      where: {
        id: assessmentId,
        created_by: STUB_USER_ID,
        deleted_at: null,
      },
      data,
    });

    if (res.count === 0) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    const row = await prisma.assessments.findFirst({
      where: { id: assessmentId, created_by: STUB_USER_ID, deleted_at: null },
      select: { project_brief: true, stakeholders: true },
    });

    return NextResponse.json({
      ok: true,
      projectBrief: row?.project_brief ?? null,
      stakeholders: row?.stakeholders ?? [],
    });
  } catch (e) {
    console.error('[assessment-builder/assessments/[id]] PATCH', e);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

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
