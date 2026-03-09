'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  PlusCircle,
  X,
  Trash2,
  Edit3,
  Loader2,
  Database,
  FileText,
  Upload,
  CheckCircle,
} from 'lucide-react';

export type KBCategory =
  | 'methodology'
  | 'buyer_persona'
  | 'account_intelligence'
  | 'sei_products'
  | 'sei_capabilities'
  | 'case_studies'
  | 'evaluation_criteria';

export type PersonaType = 'archetype' | 'real_account';

export interface AgentOption {
  id: string;
  name: string;
  status: string;
}

export interface KBDocumentRecord {
  id: string;
  title: string;
  description: string | null;
  category: string;
  personaType: string | null;
  content: string;
  agents: string[];
  weight: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES: { id: KBCategory; label: string; desc: string }[] = [
  { id: 'methodology', label: 'Methodology', desc: 'How to sell, evaluate, or deliver — frameworks and structured approaches' },
  { id: 'buyer_persona', label: 'Buyer Persona', desc: 'Archetypal or real buyer profiles used in coaching sessions' },
  { id: 'account_intelligence', label: 'Account Intelligence', desc: 'Research and intel on specific real companies and active pursuits' },
  { id: 'sei_products', label: 'SEI Products', desc: "Named SEI offerings — scope, pricing, delivery model, ideal client" },
  { id: 'sei_capabilities', label: 'SEI Capabilities', desc: "Broader service line descriptions and SEI's positioning in the market" },
  { id: 'case_studies', label: 'Case Studies', desc: 'Client engagement narratives with context, approach, and outcomes' },
  { id: 'evaluation_criteria', label: 'Evaluation Criteria', desc: 'Scoring signals and quality heuristics used to judge session performance' },
];

const TITLE_PLACEHOLDERS: Record<KBCategory, string> = {
  methodology: 'e.g. How to Position the AI Readiness Assessment',
  buyer_persona: 'e.g. Marcus Webb — VP Supply Chain, Hartfield Manufacturing',
  account_intelligence: 'e.g. Holeman — Supply Chain Risk Profile',
  sei_products: 'e.g. AI Readiness Assessment — Product Overview',
  sei_capabilities: 'e.g. AI & Technology Service Line — Positioning Guide',
  case_studies: 'e.g. How SEI reduced carrying costs 22% for a contract manufacturer',
  evaluation_criteria: 'e.g. AI Assessment — Strong Product Knowledge Signals',
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  methodology: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  buyer_persona: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  account_intelligence: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  sei_products: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  sei_capabilities: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
  case_studies: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  evaluation_criteria: { bg: 'bg-plum/10', text: 'text-plum', border: 'border-plum/20' },
};

const defaultCategoryColors = { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };

function getCategoryStyle(category: string) {
  return CATEGORY_COLORS[category] ?? defaultCategoryColors;
}

export default function KnowledgeBaseTab() {
  const [documents, setDocuments] = useState<KBDocumentRecord[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<KBDocumentRecord | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [formData, setFormData] = useState<{
    category: KBCategory | '';
    personaType: PersonaType | null;
    title: string;
    description: string;
    content: string;
    weight: number;
    agents: string[];
    allAgents: boolean;
  }>({
    category: '',
    personaType: null,
    title: '',
    description: '',
    content: '',
    weight: 5,
    agents: [],
    allAgents: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawerScrollRef = React.useRef<HTMLDivElement>(null);
  const contentFileInputRef = useRef<HTMLInputElement>(null);
  const [contentDragOver, setContentDragOver] = useState(false);

  const applyContentFromFile = (text: string) => {
    setFormData((prev) => ({ ...prev, content: text }));
  };

  const handleContentFile = (file: File) => {
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (ext !== '.md' && ext !== '.txt') {
      return;
    }
    const existingContent = formData.content.trim();
    const reader = new FileReader();
    reader.onload = () => {
      const text = (reader.result ?? '') as string;
      if (existingContent.length > 0 && !window.confirm('Content already exists. Overwrite with the uploaded file?')) {
        return;
      }
      applyContentFromFile(text);
    };
    reader.readAsText(file);
  };

  const onContentFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleContentFile(file);
    e.target.value = '';
  };

  const onContentDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setContentDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleContentFile(file);
  };

  const fetchDocuments = async () => {
    const params = new URLSearchParams();
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    if (agentFilter !== 'all') params.set('agent', agentFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    const res = await fetch(`/api/admin/documents?${params}`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    const data = await res.json();
    setDocuments(data);
  };

  const fetchAgents = async () => {
    const res = await fetch('/api/admin/agents');
    if (!res.ok) throw new Error('Failed to fetch agents');
    const data = await res.json();
    setAgents(data);
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchDocuments(), fetchAgents()]).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (categoryFilter !== 'all' || agentFilter !== 'all' || statusFilter !== 'all') {
      fetchDocuments();
    } else {
      fetchDocuments();
    }
  }, [categoryFilter, agentFilter, statusFilter]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  const clearSuccessMessage = () => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    setSuccessMessage(null);
  };

  const openCreate = () => {
    clearSuccessMessage();
    setDrawerMode('create');
    setFormData({
      category: '',
      personaType: null,
      title: '',
      description: '',
      content: '',
      weight: 5,
      agents: [],
      allAgents: false,
    });
    setErrors({});
    setIsDrawerOpen(true);
  };

  const openEdit = (doc: KBDocumentRecord) => {
    clearSuccessMessage();
    setDrawerMode('edit');
    setFormData({
      category: doc.category as KBCategory,
      personaType: (doc.personaType as PersonaType) ?? null,
      title: doc.title,
      description: doc.description ?? '',
      content: doc.content,
      weight: typeof doc.weight === 'number' ? Math.min(10, Math.max(1, doc.weight)) : 5,
      agents: doc.agents.includes('all') ? [] : doc.agents,
      allAgents: doc.agents.includes('all'),
    });
    setErrors({});
    setSelectedDoc(doc);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedDoc(null);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!formData.category) e.category = 'Category is required';
    if (!formData.title?.trim()) e.title = 'Title is required';
    if (!formData.content?.trim()) e.content = 'Content is required';
    const hasAgents = formData.allAgents || formData.agents.length > 0;
    if (!hasAgents) e.agents = 'Assign to at least one agent';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const getAgentsPayload = (): string[] => {
    if (formData.allAgents) return ['all'];
    return formData.agents;
  };

  const handleSave = async (status: 'draft' | 'published') => {
    setErrors({});
    if (!validate()) {
      drawerScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const payload = {
      ...formData,
      agents: getAgentsPayload(),
      status,
    };
    if (formData.category === 'buyer_persona' && formData.personaType) {
      (payload as any).personaType = formData.personaType;
    }
    setIsSaving(true);
    setErrors((prev) => ({ ...prev, submit: '' }));
    try {
      const url = drawerMode === 'edit' && selectedDoc ? `/api/admin/documents/${selectedDoc.id}` : '/api/admin/documents';
      const method = drawerMode === 'edit' ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to save');
      }
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      setSuccessMessage(status === 'published' ? 'Document published successfully.' : 'Draft saved successfully.');
      successTimeoutRef.current = setTimeout(clearSuccessMessage, 4000);
      await fetchDocuments();
      closeDrawer();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save document';
      console.error(err);
      setErrors((prev) => ({ ...prev, submit: message }));
      drawerScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document? This will also remove all its chunks.')) return;
    try {
      const res = await fetch(`/api/admin/documents/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      closeDrawer();
    } catch (err) {
      console.error(err);
    }
  };

  const canPublish = formData.category && formData.title?.trim() && formData.content?.trim() && (formData.allAgents || formData.agents.length > 0);
  const assignedLabel = formData.allAgents ? 'Assigned to all agents' : formData.agents.length > 0
    ? `Assigned to: ${formData.agents.map((id) => agents.find((a) => a.id === id)?.name ?? id).join(', ')}`
    : '';

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-8 text-gray-900 relative">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-plum-dark">Knowledge Base</h1>
            <p className="text-gray-500 mt-2 font-medium">Manage documents and assign them to agents for RAG retrieval.</p>
          </div>
          <button
            onClick={openCreate}
            className="bg-[#3A2449] text-white px-8 py-3 rounded-xl font-semibold shadow-sm hover:bg-[#2D1B3D] transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <PlusCircle size={20} />
            Add New Document
          </button>
        </header>

        {successMessage && (
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 px-5 py-3 text-green-800">
            <CheckCircle size={22} className="shrink-0 text-green-600" />
            <p className="font-semibold">{successMessage}</p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-plum/40 uppercase tracking-wider">Category</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white border border-plum/10 rounded-xl px-4 py-2.5 text-sm font-medium text-plum-dark focus:outline-none focus:ring-2 focus:ring-plum/20"
            >
              <option value="all">All</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-plum/40 uppercase tracking-wider">Agent</span>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="bg-white border border-plum/10 rounded-xl px-4 py-2.5 text-sm font-medium text-plum-dark focus:outline-none focus:ring-2 focus:ring-plum/20"
            >
              <option value="all">All</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-plum/40 uppercase tracking-wider">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-plum/10 rounded-xl px-4 py-2.5 text-sm font-medium text-plum-dark focus:outline-none focus:ring-2 focus:ring-plum/20"
            >
              <option value="all">All</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Library table */}
        <div className="bg-white rounded-2xl shadow-sm border border-plum/10 overflow-hidden min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-plum/40">
              <Loader2 size={40} className="animate-spin" />
              <p className="text-sm font-bold uppercase tracking-widest mt-4">Loading...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-plum/5 border-b border-plum/5">
                  <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Category</th>
                  <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Title</th>
                  <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Assigned agents</th>
                  <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-plum/5">
                {documents.map((doc) => {
                  const style = getCategoryStyle(doc.category);
                  const agentLabel = doc.agents.includes('all')
                    ? 'All agents'
                    : doc.agents.map((id) => agents.find((a) => a.id === id)?.name ?? id).join(', ');
                  return (
                    <tr key={doc.id} className="hover:bg-plum/5 transition-all group">
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}>
                          {CATEGORIES.find((c) => c.id === doc.category)?.label ?? doc.category}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-[15px] font-bold text-plum-dark">{doc.title}</p>
                      </td>
                      <td className="px-8 py-5 text-sm text-gray-500">{agentLabel || '—'}</td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${doc.status === 'published' ? 'bg-gray-100 text-gray-600 border border-gray-200' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 flex items-center gap-2">
                        <button
                          onClick={() => openEdit(doc)}
                          className="p-2 rounded-lg border border-plum/10 text-plum/60 hover:text-plum-dark hover:bg-plum/5 transition-all"
                          title="Edit"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="p-2 rounded-lg border border-plum/10 text-plum/40 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {documents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-gray-400 font-medium">
                      No documents yet. Add a document to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Drawer: Add / Edit */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-500 ${isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-plum-dark/20 backdrop-blur-sm" onClick={closeDrawer} />
        <aside className={`absolute top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl border-l border-plum/10 transition-transform duration-500 ease-out transform ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="h-full flex flex-col">
            <div className="p-8 border-b border-plum/5 flex items-center justify-between bg-plum/5">
              <div className="flex items-center gap-3 text-plum/40">
                {drawerMode === 'create' ? <PlusCircle size={18} /> : <Edit3 size={18} />}
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{drawerMode === 'create' ? 'Add New Document' : 'Edit Document'}</span>
              </div>
              <button onClick={closeDrawer} className="p-2 hover:bg-plum/10 rounded-full transition-all text-plum/40 hover:text-plum-dark">
                <X size={20} />
              </button>
            </div>

            <div ref={drawerScrollRef} className="flex-grow overflow-y-auto p-8 space-y-8">
              {/* 1. Document Category */}
              <div>
                <label className="text-xs font-bold text-plum-dark/80 uppercase tracking-[0.2em] mb-2 block">Document Category <span className="text-[#E84855]">*</span></label>
                <div className="space-y-0">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, category: c.id, personaType: c.id === 'buyer_persona' ? 'archetype' : null }))}
                      className={`w-full flex items-center gap-3 h-9 px-3 text-left transition-all ${formData.category === c.id ? 'bg-plum/10 border-l-4 border-plum-dark text-plum-dark' : 'border-l-4 border-transparent text-gray-700 hover:bg-plum/5'}`}
                    >
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${formData.category === c.id ? 'border-plum-dark bg-plum-dark' : 'border-plum/40'}`}>
                        {formData.category === c.id && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                      <span className="text-[13px] font-medium shrink-0">{c.label}</span>
                      <span className={`text-[11px] truncate ${formData.category === c.id ? 'text-plum/70' : 'text-gray-500'}`}>{c.desc}</span>
                    </button>
                  ))}
                </div>
                {errors.category && <p className="text-[#E84855] text-[10px] font-bold mt-1">{errors.category}</p>}
              </div>

              {/* 2. Title */}
              <div>
                <label className="text-xs font-bold text-plum-dark/80 uppercase tracking-[0.2em] mb-2 block">Title <span className="text-[#E84855]">*</span></label>
                <input
                  type="text"
                  placeholder={formData.category ? TITLE_PLACEHOLDERS[formData.category] : 'Select a category first'}
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className={`w-full bg-white border ${errors.title ? 'border-[#E84855]' : 'border-plum/20'} rounded-lg px-4 py-3 text-plum-dark font-medium focus:outline-none focus:border-[#3A2449]/50 transition-all shadow-sm`}
                />
                {errors.title && <p className="text-[#E84855] text-[10px] mt-1 font-bold">{errors.title}</p>}
              </div>

              {/* 3. Description */}
              <div>
                <label className="text-xs font-bold text-plum-dark/80 uppercase tracking-[0.2em] mb-2 block">Description (optional)</label>
                <input
                  type="text"
                  placeholder="One-line summary for admin reference."
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-white border border-plum/20 rounded-lg px-4 py-3 text-plum-dark font-medium focus:outline-none focus:border-[#3A2449]/50 transition-all shadow-sm"
                />
              </div>

              {/* Adherence (Document Weight) */}
              <div>
                <label className="text-xs font-bold text-plum-dark/80 uppercase tracking-[0.2em] mb-2 block">Adherence</label>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-medium text-gray-500 shrink-0 w-24">Background context</span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={formData.weight}
                    onChange={(e) => setFormData((prev) => ({ ...prev, weight: parseInt(e.target.value, 10) }))}
                    className="flex-1 h-2 bg-plum/10 rounded-full appearance-none cursor-pointer accent-[#3A2449]"
                  />
                  <span className="text-[11px] font-medium text-gray-500 shrink-0 w-24 text-right">Follow strictly</span>
                </div>
                <p className="text-[10px] text-plum/50 mt-1 font-medium">Weight: {formData.weight}</p>
              </div>

              {/* 4. Content */}
              <div>
                <label className="text-xs font-bold text-plum-dark/80 uppercase tracking-[0.2em] mb-2 block">Content <span className="text-[#E84855]">*</span></label>
                <input
                  ref={contentFileInputRef}
                  type="file"
                  accept=".md,.txt"
                  className="hidden"
                  onChange={onContentFileInputChange}
                />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => contentFileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setContentDragOver(true); }}
                  onDragLeave={() => setContentDragOver(false)}
                  onDrop={onContentDrop}
                  className={`mb-2 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed text-sm font-medium cursor-pointer transition-all ${contentDragOver ? 'border-plum bg-plum/10 text-plum-dark' : 'border-plum/20 text-plum-dark/80 hover:border-plum/40 hover:bg-plum/5'}`}
                >
                  <Upload size={14} />
                  <span>Upload .md or .txt file</span>
                </div>
                <textarea
                  placeholder="Paste or write document content here. Markdown is supported."
                  value={formData.content}
                  onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                  className={`w-full bg-white border ${errors.content ? 'border-[#E84855]' : 'border-plum/20'} rounded-lg px-4 py-3 text-plum-dark font-medium focus:outline-none focus:border-[#3A2449]/50 transition-all min-h-[200px] resize-y shadow-sm`}
                />
                <p className="text-[10px] text-plum/40 mt-1 font-bold uppercase tracking-wider">{formData.content.length} characters</p>
                {errors.content && <p className="text-[#E84855] text-[10px] mt-1 font-bold">{errors.content}</p>}
              </div>

              {/* 5. Assign to Agents */}
              <div>
                <label className="text-xs font-bold text-plum-dark/80 uppercase tracking-[0.2em] mb-2 block">Assign to Agents <span className="text-[#E84855]">*</span></label>
                <div className="space-y-1">
                  <label className={`flex items-center gap-3 py-2.5 px-3 rounded-lg border cursor-pointer transition-all ${formData.allAgents ? 'bg-plum-dark text-white border-plum-dark' : 'bg-white border-plum/20 hover:bg-plum/5 hover:border-plum/30'}`}>
                    <input
                      type="checkbox"
                      checked={formData.allAgents}
                      onChange={(e) => setFormData((prev) => ({ ...prev, allAgents: e.target.checked, agents: e.target.checked ? [] : prev.agents }))}
                      className="rounded border-plum/30 text-[#3A2449] focus:ring-[#3A2449] accent-[#3A2449]"
                    />
                    <span className={`font-semibold ${formData.allAgents ? 'text-white' : 'text-plum-dark'}`}>All Agents</span>
                  </label>
                  {agents.map((a) => (
                    <label
                      key={a.id}
                      className={`flex items-center gap-3 py-2.5 px-3 rounded-lg border cursor-pointer transition-all ${formData.allAgents ? 'opacity-50 pointer-events-none' : ''} ${formData.agents.includes(a.id) ? 'bg-plum/10 border-plum/30' : 'bg-white border-plum/20 hover:bg-plum/5 hover:border-plum/30'}`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.agents.includes(a.id)}
                        disabled={formData.allAgents}
                        onChange={(e) => {
                          if (formData.allAgents) return;
                          setFormData((prev) => ({
                            ...prev,
                            agents: e.target.checked ? [...prev.agents, a.id] : prev.agents.filter((id) => id !== a.id),
                          }));
                        }}
                        className="rounded border-plum/30 text-[#3A2449] focus:ring-[#3A2449] accent-[#3A2449]"
                      />
                      <span className="font-medium text-plum-dark">{a.name}</span>
                      <span className={`ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded ${a.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {a.status}
                      </span>
                    </label>
                  ))}
                </div>
                {assignedLabel && <p className="text-xs text-plum/60 mt-2 font-medium">{assignedLabel}</p>}
                {errors.agents && <p className="text-[#E84855] text-[10px] mt-1 font-bold">{errors.agents}</p>}
              </div>

              {errors.submit && <p className="text-[#E84855] text-sm font-bold">{errors.submit}</p>}
            </div>

            <div className="p-8 border-t border-plum/5 bg-plum/5 flex items-center gap-4 flex-wrap">
              {errors.submit && (
                <p className="text-[#E84855] text-sm font-bold flex-1 min-w-0 basis-full sm:basis-auto sm:flex-initial order-first sm:order-none">
                  {errors.submit}
                </p>
              )}
              <div className="flex items-center justify-end gap-4 ml-auto">
                <button type="button" onClick={closeDrawer} className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-plum/40 hover:text-plum-dark transition-all">
                  Cancel
                </button>
              <button
                type="button"
                onClick={() => handleSave('draft')}
                disabled={isSaving}
                className="bg-gray-200 text-gray-600 hover:bg-gray-300 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                type="button"
                onClick={() => handleSave('published')}
                disabled={isSaving}
                className="bg-[#3A2449] text-white py-2 px-8 rounded-xl font-bold hover:bg-[#2D1B3D] transition-all text-sm uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Publishing...' : 'Publish'}
              </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
