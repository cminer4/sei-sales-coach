'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  User, 
  Bot, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Loader2,
  Filter,
  Layers,
  Building2,
  HelpCircle,
  FileText,
  CheckCircle2,
  Info
} from 'lucide-react';

const ROLES = ['Product Manager', 'Software Engineer', 'Designer', 'Data Analyst', 'Engineering Manager'];
const STAGES = ['Initial Screen', 'EI Round', 'Technical Round', 'Final Interview'];
const COMPANIES = ['Google', 'Amazon', 'Meta', 'Microsoft', 'Apple', 'Other'];
const FOCUS_AREAS = ['Leadership', 'Technical', 'Communication', 'Problem Solving'];

const DOC_TYPES = [
  { id: 'question', label: 'Questions', icon: HelpCircle },
  { id: 'best_practice', label: 'Best Practices', icon: CheckCircle2 },
  { id: 'company', label: 'Company Insights', icon: Building2 },
  { id: 'framework', label: 'Frameworks', icon: Layers },
];

export default function TestConsoleTab() {
  const [mode, setMode] = useState<'candidate' | 'coach'>('candidate');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [stage, setStage] = useState('');
  const [company, setCompany] = useState('');
  const [focusArea, setFocusArea] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['question', 'best_practice', 'company', 'framework']);
  
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleType = (id: string) => {
    setSelectedTypes(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      let finalQuery = query;
      let filters: any = {
        documentTypes: selectedTypes,
      };

      if (mode === 'coach') {
        // Build structured query for "Coach Asks" mode
        const focusText = focusArea ? ` focusing on ${focusArea}` : '';
        finalQuery = `${focusArea || 'Interview'} question for a ${role} during ${stage}${focusText}`;
        filters.roles = [role];
        filters.stages = [stage];
      } else {
        if (role) filters.roles = [role];
        // In "User Asks" mode, we might want company context
        if (company) finalQuery = `${query} at ${company}`;
      }

      const response = await fetch('/api/admin/retrieve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: finalQuery,
          filters,
          topK: 5,
          similarityThreshold: 0.3, // Lower threshold for easier testing
        }),
      });

      if (!response.ok) throw new Error('Retrieval failed');
      
      const data = await response.json();
      setResults(data);
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
    <div className="min-h-screen bg-[#FDFBF7] pt-16 pb-8 px-8 mt-6 text-gray-900">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-plum-dark">Knowledge Base Testing Dashboard</h1>
          <p className="text-gray-500 mt-2 font-medium max-w-2xl">Manage and monitor our model&apos;s ability to retrieve relevant documents based on specific questions and answers.</p>
        </header>

        {/* Mode Toggle */}
        <div className="bg-white p-1.5 rounded-2xl border border-plum/10 shadow-sm flex mb-8 w-fit">
          <button 
            onClick={() => { setMode('candidate'); setResults([]); setQuery(''); }}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 ${mode === 'candidate' ? 'bg-plum-dark text-white shadow-md' : 'text-plum/40 hover:text-plum-dark'}`}
          >
            <User size={16} />
            <span>User Asks Coach</span>
          </button>
          <button 
            onClick={() => { setMode('coach'); setResults([]); setQuery(''); }}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 ${mode === 'coach' ? 'bg-plum-dark text-white shadow-md' : 'text-plum/40 hover:text-plum-dark'}`}
          >
            <Bot size={16} />
            <span>Coach Asks User</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Search Form */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-plum/10 p-6 shadow-sm space-y-6">
              {mode === 'candidate' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-plum/40 uppercase tracking-widest">Test Question</label>
                    <textarea 
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="e.g., How do I handle pricing objections?"
                      className="w-full h-32 bg-plum/5 border border-plum/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-plum-dark/50 transition-all resize-none font-medium"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-plum/40 uppercase tracking-widest">Optional Context</label>
                      <select 
                        value={role} 
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full bg-plum/5 border border-plum/10 rounded-xl px-4 py-2.5 text-sm appearance-none cursor-pointer font-bold text-plum-dark"
                      >
                        <option value="">Any Role</option>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <select 
                      value={company} 
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full bg-plum/5 border border-plum/10 rounded-xl px-4 py-2.5 text-sm appearance-none cursor-pointer font-bold text-plum-dark"
                    >
                      <option value="">Any Company</option>
                      {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-plum/40 uppercase tracking-widest">Interview Context *</label>
                      <select 
                        value={role} 
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full bg-plum/5 border border-plum/10 rounded-xl px-4 py-2.5 text-sm font-bold text-plum-dark appearance-none cursor-pointer"
                      >
                        <option value="">Select Role</option>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <select 
                      value={stage} 
                      onChange={(e) => setStage(e.target.value)}
                      className="w-full bg-plum/5 border border-plum/10 rounded-xl px-4 py-2.5 text-sm font-bold text-plum-dark appearance-none cursor-pointer"
                    >
                      <option value="">Select Stage</option>
                      {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select 
                      value={focusArea} 
                      onChange={(e) => setFocusArea(e.target.value)}
                      className="w-full bg-plum/5 border border-plum/10 rounded-xl px-4 py-2.5 text-sm font-bold text-plum-dark appearance-none cursor-pointer"
                    >
                      <option value="">Any Focus Area</option>
                      {FOCUS_AREAS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div className="space-y-3 pt-2">
                <label className="text-[10px] font-bold text-plum/40 uppercase tracking-widest block">Document Types</label>
                <div className="grid grid-cols-1 gap-2">
                  {DOC_TYPES.map(type => (
                    <button
                      key={type.id}
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
                onClick={handleSearch}
                disabled={isLoading || (mode === 'coach' && (!role || !stage)) || (mode === 'candidate' && !query)}
                className="w-full bg-plum-dark text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-plum transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                <span>{mode === 'candidate' ? 'Search Coach Context' : 'Find Relevant Questions'}</span>
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
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            res.documentType === 'question' ? 'bg-green-50 text-green-600 border border-green-100' :
                            res.documentType === 'company' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                            res.documentType === 'best_practice' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                            'bg-plum/5 text-plum border border-plum/10'
                          }`}>
                            {res.documentType.replace('_', ' ')}
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

                      {expandedId === idx && mode === 'coach' && res.documentType === 'question' && (
                        <div className="mt-6 space-y-4 pt-6 border-t border-plum/5">
                          {res.metadata?.exampleAnswer && (
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Strong Answer Example</span>
                              <p className="text-sm text-gray-600 italic bg-green-50/50 p-4 rounded-xl border border-green-100">
                                "{res.metadata.exampleAnswer}"
                              </p>
                            </div>
                          )}
                          {res.metadata?.whyItsStrong && (
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">What We Look For</span>
                              <p className="text-sm text-gray-600 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                                {res.metadata.whyItsStrong}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
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
                    {mode === 'candidate' 
                      ? "Enter a question to see what supporting context the coach can find." 
                      : "Select a role and stage to see what questions the coach might retrieve."}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
                  <p className="text-[10px] font-bold text-plum/20 uppercase tracking-widest mb-2">Try an example</p>
                  <button 
                    onClick={() => {
                      if (mode === 'candidate') setQuery("How do I handle pricing objections?");
                      else { setRole('Product Manager'); setStage('EI Round'); setFocusArea('Leadership'); }
                    }}
                    className="text-xs font-bold text-plum/40 hover:text-plum-dark hover:bg-plum/5 py-2 px-4 rounded-xl border border-plum/5 transition-all flex items-center justify-center"
                  >
                    <span>{mode === 'candidate' ? "How do I handle pricing objections?" : "PM • EI Round • Leadership"}</span>
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
