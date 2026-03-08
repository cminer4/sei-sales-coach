import { NextRequest, NextResponse } from 'next/server';

/**
 * CSV import was built for the previous Q&A document schema and is no longer supported
 * after the knowledge base rebuild (knowledge_base_documents). Use the Knowledge Base
 * "Add New Document" form instead.
 */
export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: 'Document import is no longer supported. Use Add New Document in the Knowledge Base tab.' },
    { status: 410 }
  );
}
