import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateKeyObjectives, generateCoachResponse } from '@/lib/coaching';
import { logSystemEvent } from '@/lib/logSystemEvent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, role, company, resumeText, interviewType, jobDescription, preferredName } = body;

    // Use a default coach ID for now
    const coachId = '237f7015-e905-4cd7-ab52-5020e0909e9c';

    let session;

    if (sessionId) {
      // Update existing session
      session = await prisma.interviewSession.update({
        where: { id: sessionId },
        data: {
          interviewConfig: {
            ...(body as any),
            updatedAt: new Date().toISOString(),
          },
        },
      });
    } else {
      // Create new session
      session = await prisma.interviewSession.create({
        data: {
          coachId,
          interviewConfig: {
            ...body,
            createdAt: new Date().toISOString(),
          },
        },
      });
    }

    const preProcessedData: any = { ...((session.interviewConfig as any) || {}) };
    let needsUpdate = false;

    // 1. If role and company are provided, pre-generate objectives
    if (role && company && interviewType && !preProcessedData.objectives) {
      const objectives = await generateKeyObjectives(role, company, interviewType);
      preProcessedData.objectives = objectives;
      needsUpdate = true;
    }

    // 2. Pre-generate the initial coach greeting if we have enough info
    // This reduces the 2-3s delay when entering the coach page
    if (role && company && interviewType && !preProcessedData.initialGreeting) {
      const initialGreeting = await generateCoachResponse({
        userMessage: "Hello, I am ready to start my interview practice.",
        sessionContext: {
          role: role || 'Candidate',
          company: company || 'Target Company',
          interviewType: interviewType || 'Interview',
          stage: interviewType || 'Initial',
          conversationHistory: [],
          coachId,
          resumeText: resumeText || '',
          preferredName: preferredName || ''
        }
      });
      preProcessedData.initialGreeting = initialGreeting;
      needsUpdate = true;
    }

    if (needsUpdate) {
      session = await prisma.interviewSession.update({
        where: { id: session.id },
        data: {
          interviewConfig: preProcessedData,
        },
      });
    }

    return NextResponse.json({ 
      sessionId: session.id,
      preProcessedData
    });

  } catch (error: any) {
    console.error('Error in /api/onboarding/session:', error);
    try {
      await logSystemEvent({
        route: '/api/onboarding/session',
        event_type: 'onboarding_session_failure',
        severity: 'error',
        message: 'Failed to create onboarding session.',
        metadata: { error: error?.message ?? String(error) },
      });
    } catch (_) {}
    return NextResponse.json(
      { error: error.message || 'Failed to process onboarding step' },
      { status: 500 }
    );
  }
}
