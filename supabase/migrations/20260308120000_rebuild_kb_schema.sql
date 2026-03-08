-- Rebuild Knowledge Base schema: replace Q&A-based coach_documents/coach_chunks
-- with category-based knowledge_base_documents and knowledge_base_chunks.
-- Drops old KB tables and creates new ones; does not touch coaches or agents.

-- Drop old knowledge base tables (order matters: chunks -> document_taxonomies -> coach_documents)
DROP TABLE IF EXISTS coach_chunks;
DROP TABLE IF EXISTS document_taxonomies;
DROP TABLE IF EXISTS coach_documents;

-- New documents table
CREATE TABLE knowledge_base_documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  category    text NOT NULL CHECK (category IN (
    'methodology', 'buyer_persona', 'account_intelligence',
    'sei_products', 'sei_capabilities', 'case_studies', 'evaluation_criteria'
  )),
  persona_type text CHECK (persona_type IS NULL OR persona_type IN ('archetype', 'real_account')),
  content     text NOT NULL,
  agents      text[],
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN knowledge_base_documents.agents IS 'Agent IDs this doc is assigned to; use [''all''] for all agents';
COMMENT ON COLUMN knowledge_base_documents.persona_type IS 'Only used when category = ''buyer_persona'': archetype | real_account';

-- Chunks table for RAG (pgvector)
CREATE TABLE knowledge_base_chunks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES knowledge_base_documents(id) ON DELETE CASCADE,
  content     text,
  embedding   vector(1536),
  chunk_index integer,
  agents      text[],
  category    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_knowledge_base_chunks_document_id ON knowledge_base_chunks(document_id);
CREATE INDEX idx_knowledge_base_chunks_agents ON knowledge_base_chunks USING GIN(agents);
CREATE INDEX idx_knowledge_base_chunks_embedding ON knowledge_base_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

COMMENT ON TABLE knowledge_base_chunks IS 'RAG chunks with embeddings; agents and category copied from parent for efficient filtering';
