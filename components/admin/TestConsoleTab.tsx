'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  FileText,
  BookOpen,
  UserCircle,
  Building2,
  Package,
  Lightbulb,
  FolderOpen,
  ClipboardCheck,
  Info,
} from 'lucide-react';

/** 7 KB categories from the new schema (lib/retrieval and knowledge_base_documents.category). */
const DOC_TYPES = [
  { id: 'methodology', label: 'Methodology', icon: BookOpen },
  { id: 'buyer_persona', label: 'Buyer Persona', icon: UserCircle },
  { id: 'account_intelligence', label: 'Account Intelligence', icon: Building2 },
  { id: 'sei_products', label: 'SEI Products', icon: Package },
  { id: 'sei_capabilities', label: 'SEI Capabilities', icon: Lightbulb },
  { id: 'case_studies', label: 'Case Studies', icon: FolderOpen },
  { id: 'evaluation_criteria', label: 'Evaluation Criteria', icon: ClipboardCheck },
];

const ALL_DOC_TYPE_IDS = DOC_TYPES.map((t) => t.id);

export default function TestConsoleTab() {
  const [query, setQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(ALL_DOC_TYPE_IDS);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);

  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/admin/agents')
      .then((res) => res.ok ? res.json() : [])
      .then((agents: { id: string; status: string }[]) => {
        const active = Array.isArray(agents) ? agents.find((a) => a.status === 'active') : null;
        setActiveAgentId(active ? active.id : null);
      })
      .catch(() => setActiveAgentId(null));
  }, []);

  const toggleType = (id: string) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const body: { query: string; agentId?: string; filters: { documentTypes: string[] }; topK: number; similarityThreshold: number } = {
        query: query.trim(),
        filters: { documentTypes: selectedTypes },
        topK: 5,
        similarityThreshold: 0.3,
      };
      if (activeAgentId) body.agentId = activeAgentId;

      const response = await fetch('/api/admin/retrieve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || 'Retrieval failed');
      }

      const data = await response.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const statsSummary = useMemo(() => {
    if (results.length === 0) return null;
    const avgSimilarity = results.reduce((acc, curr) => acc + curr.similarity, 0) / results.length;
    return {
      count: results.length,
      avgSimilarity: (avgSimilarity * 100).toFixed(1),
    };
  }, [results]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-plum-dark">Knowledge Base Testing Dashboard</h1>
          <p className="text-gray-500 mt-2 font-medium max-w-2xl">Test retrieval against the current knowledge base. Select document types and run a query; results use the active agent&apos;s assigned documents.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Search Form */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-plum/10 p-6 shadow-sm space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-plum/40 uppercase tracking-widest">Search query</label>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., How do I handle pricing objections?"
                  className="w-full h-32 bg-plum/5 border border-plum/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-plum-dark/50 transition-all resize-none font-medium"
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-[10px] font-bold text-plum/40 uppercase tracking-widest block">Document Types</label>
                <div className="grid grid-cols-1 gap-2">
                  {DOC_TYPES.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => toggleType(type.id)}
                      className={`flex items-center space-x-3 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                        selectedTypes.includes(type.id)
                          ? 'bg-plum-dark text-white border-plum-dark shadow-sm'
                          : 'bg-white text-plum/40 border-plum/10 hover:border-plum/20'
                      }`}
                    >
                      <type.icon size={14} />
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSearch}
                disabled={isLoading || !query.trim()}
                className="w-full bg-plum-dark text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-plum transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                <span>Search</span>
              </button>
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-2 space-y-6">
            {!isLoading && results.length > 0 && (
              <div className="flex items-center justify-between bg-plum/5 px-6 py-3 rounded-2xl border border-plum/5">
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-plum/40 uppercase tracking-widest">Results Found</span>
                    <span className="text-xl font-bold text-plum-dark">{statsSummary?.count}</span>
                  </div>
                  <div className="h-8 w-px bg-plum/10" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-plum/40 uppercase tracking-widest">Avg Similarity</span>
                    <span className="text-xl font-bold text-plum-dark">{statsSummary?.avgSimilarity}%</span>
                  </div>
                </div>
                <Info size={18} className="text-plum/20" />
              </div>
            )}

            {isLoading ? (
              <div className="bg-white rounded-2xl border border-plum/10 p-20 flex flex-col items-center justify-center space-y-4 text-plum/40 shadow-sm">
                <Loader2 size={40} className="animate-spin" />
                <p className="text-xs font-bold uppercase tracking-widest">Querying Semantic Index...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-4">
                {results.map((res, idx) => (
                  <div key={idx} className="bg-white rounded-2xl border border-plum/10 shadow-sm overflow-hidden group hover:border-plum/30 transition-all">
                    <div 
                      className="p-6 cursor-pointer" 
                      onClick={() => setExpandedId(expandedId === idx ? null : idx)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-plum/5 text-plum-dark border border-plum/10">
                            {DOC_TYPES.find((t) => t.id === res.documentType)?.label ?? res.documentType?.replace(/_/g, ' ') ?? '—'}
                          </span>
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                            res.similarity > 0.8 ? 'bg-green-500 text-white' :
                            res.similarity > 0.7 ? 'bg-emerald-400 text-white' :
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {(res.similarity * 100).toFixed(1)}% Match
                          </span>
                        </div>
                        {expandedId === idx ? <ChevronUp size={18} className="text-plum/40" /> : <ChevronDown size={18} className="text-plum/40" />}
                      </div>
                      
                      <h3 className="text-lg font-bold text-plum-dark mb-3 leading-tight">{res.documentTitle}</h3>
                      
                      <p className={`text-sm text-gray-600 leading-relaxed font-medium ${expandedId === idx ? '' : 'line-clamp-2'}`}>
                        {res.chunkText}
                      </p>
                    </div>
                    
                    {expandedId === idx && (
                      <div className="px-6 py-4 bg-plum/5 flex items-center justify-between border-t border-plum/5">
                        <span className="text-[10px] font-bold text-plum/40 uppercase tracking-widest flex items-center">
                          <FileText size={12} className="mr-2" /> 
                          Chunk Details
                        </span>
                        <button className="text-[10px] font-black text-plum-dark uppercase tracking-widest hover:underline flex items-center space-x-1">
                          <span>View Full Document</span>
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-plum/20 p-20 flex flex-col items-center justify-center text-center space-y-6 shadow-sm">
                <div className="p-6 bg-plum/5 rounded-full text-plum/20">
                  <Search size={48} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-plum-dark">No search results yet</h3>
                  <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">
                    Enter a query and click Search to see which knowledge base chunks are retrieved for the active agent.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
                  <p className="text-[10px] font-bold text-plum/20 uppercase tracking-widest mb-2">Try an example</p>
                  <button
                    type="button"
                    onClick={() => setQuery('How do I handle pricing objections?')}
                    className="text-xs font-bold text-plum/40 hover:text-plum-dark hover:bg-plum/5 py-2 px-4 rounded-xl border border-plum/5 transition-all flex items-center justify-center"
                  >
                    <span>How do I handle pricing objections?</span>
                    <ArrowRight size={12} className="ml-2" />
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center space-x-3 text-red-600">
                <Info size={18} />
                <p className="text-sm font-bold">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
