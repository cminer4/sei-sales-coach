'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { KBDocument } from '@/lib/mock-data'; // Use the interface, but fetch data from API
import { agentConfig } from '@/lib/agentConfig';
import { 
  Search, 
  Filter, 
  X, 
  Trash2, 
  ExternalLink,
  PlusCircle,
  Upload,
  Calendar,
  Clock,
  FileText,
  Check,
  HelpCircle,
  Building2,
  CheckCircle2,
  Layout,
  Database,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Loader2,
  Info
} from 'lucide-react';

// Helper Components
const MultiSelect = ({ label, options, selected, onToggle, onSelectAll, error }: any) => {
  const isAllSelected = options.length > 0 && options.every((opt: string) => selected?.includes(opt));
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-3">
        <label className="text-xs font-bold text-plum/40 uppercase tracking-[0.2em]">{label} <span className="text-[#E84855]">*</span></label>
        <button 
          onClick={(e) => { e.preventDefault(); onSelectAll(); }}
          className="text-[10px] font-bold text-[#3A2449] hover:underline bg-plum/5 px-2 py-0.5 rounded"
        >
          {isAllSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option: string) => (
          <button
            key={option}
            onClick={(e) => { e.preventDefault(); onToggle(option); }}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
              selected?.includes(option)
                ? 'bg-plum-dark text-white border-plum-dark'
                : 'bg-white text-plum/60 border-plum/10 hover:border-plum/30'
            }`}
          >
            {option}
            {selected?.includes(option) && <Check size={14} />}
          </button>
        ))}
      </div>
      {error && <p className="text-[#E84855] text-[10px] font-bold">{error}</p>}
    </div>
  );
};

const SectionHeader = ({ label }: { label: string }) => (
  <div className="pt-4 border-t border-plum/5">
    <h4 className="text-xs font-bold text-plum/20 uppercase tracking-[0.3em]">{label}</h4>
  </div>
);

const ROLES = ['Product Manager', 'Software Engineer', 'Designer', 'Data Analyst', 'Engineering Manager'];
const STAGES = agentConfig.admin.stages;
const INDUSTRIES = ['Tech', 'Finance', 'Healthcare', 'Manufacturing', 'Consulting', 'Other'];
const FRAMEWORK_TYPES = ['Behavioral', 'Product Design', 'Technical', 'Analytical', 'General'];

const ITEMS_PER_PAGE = 50;

const DOCUMENT_TYPES = [
  { id: 'question', label: 'Question', adherence: 30, color: 'text-green-700', bg: 'bg-green-100', subtext: 'Enter questions to help the agent understand what to ask and what great looks like.' },
  { id: 'company', label: 'Company Insight', adherence: 50, color: 'text-orange-700', bg: 'bg-orange-100', subtext: 'Enter information on specific companies that will help the agent understand their approach to hiring.' },
  { id: 'best_practice', label: 'Best Practice', adherence: 70, color: 'text-indigo-700', bg: 'bg-indigo-100', subtext: 'Enter best practices for different parts of the hiring process to help the agent understand what great looks like.' },
  { id: 'framework', label: 'Problem Solving Framework', adherence: 95, color: 'text-plum', bg: 'bg-plum/10', subtext: 'Enter known problem-solving frameworks to help the agent understand what to look for in responses and how to structure questions.' },
];

export default function KnowledgeBaseTab() {
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [isGuidelinesModalOpen, setIsGuidelinesModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedDoc, setSelectedDoc] = useState<KBDocument | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number; errors: string[] } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  const [formData, setFormData] = useState<any>({
    type: 'question',
    title: '',
    status: 'draft',
    roles: [],
    stages: [],
    content: '',
    exampleAnswer: '',
    whyItsStrong: '',
    companyName: '',
    industry: '',
    topic: '',
    frameworkName: '',
    frameworkType: '',
    strictness_override: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const drawerScrollRef = React.useRef<HTMLDivElement>(null);
  const detailScrollRef = React.useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Reset scroll position when drawers open
  useEffect(() => {
    if (isDrawerOpen && drawerScrollRef.current) {
      drawerScrollRef.current.scrollTop = 0;
    }
  }, [isDrawerOpen]);

  useEffect(() => {
    if (selectedDoc && detailScrollRef.current) {
      detailScrollRef.current.scrollTop = 0;
    }
  }, [selectedDoc]);

  // Fetch documents on load
  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/documents');
      if (!response.ok) throw new Error('Failed to fetch documents');
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    const dismissed = localStorage.getItem('dismissed-quality-banner');
    if (dismissed === 'true') {
      setIsBannerDismissed(true);
    }
  }, []);

  const dismissBanner = () => {
    setIsBannerDismissed(true);
    localStorage.setItem('dismissed-quality-banner', 'true');
  };

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      openCreateDrawer();
      router.replace('/admin');
    }
  }, [searchParams, router]);

  const openCreateDrawer = () => {
    setDrawerMode('create');
    setFormData({
      type: 'question',
      title: '',
      status: 'draft',
      roles: [],
      stages: [],
      content: '',
      exampleAnswer: '',
      whyItsStrong: '',
      companyName: '',
      industry: '',
      topic: '',
      frameworkName: '',
      frameworkType: '',
      strictness_override: null,
    });
    setErrors({});
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (doc: KBDocument) => {
    setDrawerMode('edit');
    setFormData({
      ...doc,
      roles: doc.roles || [],
      stages: doc.stages || [],
      strictness_override: doc.strictness_override || null,
    });
    setErrors({});
    setIsDrawerOpen(true);
    setSelectedDoc(null);
  };

  useEffect(() => {
    if (drawerMode === 'create' && (formData.type === 'best_practice' || formData.type === 'framework')) {
      setFormData((prev: any) => ({
        ...prev,
        roles: ROLES,
        stages: STAGES
      }));
    }
  }, [formData.type, drawerMode]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter]);

  const toggleSelection = (field: 'roles' | 'stages', value: string) => {
    setFormData((prev: any) => {
      const current = prev[field] || [];
      const updated = current.includes(value)
        ? current.filter((v: string) => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  const selectAll = (field: 'roles' | 'stages') => {
    const options = field === 'roles' ? ROLES : STAGES;
    setFormData((prev: any) => {
      const current = prev[field] || [];
      const isAllSelected = options.length > 0 && options.every(opt => current.includes(opt));
      return { ...prev, [field]: isAllSelected ? [] : options };
    });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title) newErrors.title = 'Title is required';
    
    if (formData.type === 'question') {
      if (!formData.content) newErrors.content = 'Question text is required';
      if (!formData.roles?.length) newErrors.roles = 'At least one role is required';
      if (!formData.stages?.length) newErrors.stages = 'At least one stage is required';
    } else if (formData.type === 'company') {
      if (!formData.companyName) newErrors.companyName = 'Company name is required';
      if (!formData.industry) newErrors.industry = 'Industry is required';
      if (!formData.roles?.length) newErrors.roles = 'At least one role is required';
      if (!formData.content) newErrors.content = 'Required information is missing';
    } else if (formData.type === 'best_practice') {
      if (!formData.topic) newErrors.topic = 'Topic is required';
      if (!formData.content) newErrors.content = 'Overview is required';
    } else if (formData.type === 'framework') {
      if (!formData.frameworkName) newErrors.frameworkName = 'Framework name is required';
      if (!formData.frameworkType) newErrors.frameworkType = 'Framework type is required';
      if (!formData.content) newErrors.content = 'Overview is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (status: 'draft' | 'active') => {
    if (!validate()) return;
    setIsSaving(true);

    try {
      const url = drawerMode === 'edit' ? `/api/admin/documents/${formData.id}` : '/api/admin/documents';
      const method = drawerMode === 'edit' ? 'PUT' : 'POST'; // Note: I should add PUT to the API routes if I want to support editing properly

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, status }),
      });

      if (!response.ok) throw new Error('Failed to save document');

      await fetchDocuments();
      setIsDrawerOpen(false);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`/api/admin/documents/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete document');

      setDocuments(prev => prev.filter(d => d.id !== id));
      setSelectedDoc(null);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || doc.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [documents, searchTerm, typeFilter]);

  const totalPages = Math.ceil(filteredDocs.length / ITEMS_PER_PAGE);
  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDocs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDocs, currentPage]);

  const stats = useMemo(() => {
    const counts = {
      all: documents.length,
      question: documents.filter(d => d.type === 'question').length,
      company: documents.filter(d => d.type === 'company').length,
      best_practice: documents.filter(d => d.type === 'best_practice').length,
      framework: documents.filter(d => d.type === 'framework').length,
    };
    return counts;
  }, [documents]);

  const statCards = [
    { label: 'Total Documents', count: stats.all, icon: Database, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', type: 'all' },
    { label: 'Questions', count: stats.question, icon: HelpCircle, color: 'text-green-700', bg: 'bg-green-100', border: 'border-green-200', type: 'question' },
    { label: 'Companies', count: stats.company, icon: Building2, color: 'text-orange-700', bg: 'bg-orange-100', border: 'border-orange-200', type: 'company' },
    { label: 'Best Practices', count: stats.best_practice, icon: CheckCircle2, color: 'text-indigo-700', bg: 'bg-indigo-100', border: 'border-indigo-200', type: 'best_practice' },
    { label: 'Frameworks', count: stats.framework, icon: Layout, color: 'text-plum', bg: 'bg-plum/10', border: 'border-plum/20', type: 'framework' },
  ];

  const currentTypeInfo = DOCUMENT_TYPES.find(t => t.id === formData.type);

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-8 text-gray-900 relative">
      <div className="max-w-7xl mx-auto">
        {!isBannerDismissed && (
          <div className="mb-8 bg-purple-50 border border-purple-100 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top duration-500">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-purple-100 rounded-xl text-purple-600">
                <Info size={20} />
              </div>
              <p className="text-sm font-medium text-purple-900">
                <span className="font-bold">Content Quality Matters:</span> {agentConfig.admin.contentQualityNote}
                <button 
                  onClick={() => setIsGuidelinesModalOpen(true)}
                  className="ml-2 text-purple-600 font-bold hover:underline"
                >
                  Learn More
                </button>
              </p>
            </div>
            <button 
              onClick={dismissBanner}
              className="p-2 hover:bg-purple-100 rounded-full transition-all text-purple-400 hover:text-purple-600"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-plum-dark">Knowledge Base Dashboard</h1>
            <p className="text-gray-500 mt-2 font-medium">{agentConfig.admin.dashboardSubtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setIsImportModalOpen(true); setImportResult(null); setImportFile(null); }}
              className="bg-white border-2 border-plum/20 text-plum-dark px-6 py-3 rounded-xl font-semibold shadow-sm hover:bg-plum/5 hover:border-plum/40 transition-all flex items-center space-x-2"
            >
              <Upload size={20} />
              <span>Import CSV</span>
            </button>
            <button 
              onClick={openCreateDrawer}
              className="bg-[#3A2449] text-white px-8 py-3 rounded-xl font-semibold shadow-sm hover:bg-[#2D1B3D] transition-all flex items-center space-x-2"
            >
              <PlusCircle size={20} />
              <span>Add New</span>
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          {statCards.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-6 border border-plum/10 flex flex-col items-center justify-center text-center hover:border-plum/30 transition-all group shadow-sm hover:shadow-md cursor-pointer relative overflow-hidden" onClick={() => setTypeFilter(stat.type)}>
              <div className={`p-4 rounded-xl border mb-4 group-hover:scale-110 transition-transform ${stat.bg} ${stat.border} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">{stat.label}</p>
              <p className="text-2xl font-bold text-plum-dark mt-1">{stat.count}</p>
              
              {stat.type !== 'all' && (
                <div className="mt-4 w-full px-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Adherence</span>
                    <span className="text-[9px] font-bold text-plum-dark">{DOCUMENT_TYPES.find(t => t.id === stat.type)?.adherence}%</span>
                  </div>
                  <div className="w-full h-1 bg-gray-50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        (DOCUMENT_TYPES.find(t => t.id === stat.type)?.adherence || 0) >= 80 ? 'bg-plum' :
                        (DOCUMENT_TYPES.find(t => t.id === stat.type)?.adherence || 0) >= 50 ? 'bg-blue-500' :
                        'bg-gray-400'
                      }`}
                      style={{ width: `${DOCUMENT_TYPES.find(t => t.id === stat.type)?.adherence}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Knowledge Base Table Section */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-plum-dark">Knowledge Base Library</h2>
            
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search titles..."
                  className="w-full pl-12 pr-4 py-3 bg-white border border-plum/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3A2449]/20 focus:border-[#3A2449]/50 transition-all text-sm shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex items-center space-x-2 w-full md:w-auto">
                <Filter size={18} className="text-gray-400" />
                <select
                  className="bg-white border border-plum/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3A2449]/20 shadow-sm cursor-pointer min-w-[150px]"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="question">Questions</option>
                  <option value="company">Company Insights</option>
                  <option value="best_practice">Best Practices</option>
                  <option value="framework">Problem Solving Frameworks</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-plum/10 overflow-hidden min-h-[400px] flex flex-col">
            {isLoading ? (
              <div className="flex-grow flex flex-col items-center justify-center space-y-4 text-plum/40">
                <Loader2 size={40} className="animate-spin" />
                <p className="text-sm font-bold uppercase tracking-widest">Loading Library...</p>
              </div>
            ) : (
              <>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-plum/5 border-b border-plum/5">
                      <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Type</th>
                      <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Title</th>
                      <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Adherence</th>
                      <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Updated</th>
                      <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-plum/5">
                    {paginatedDocs.map((doc) => (
                      <tr 
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc)}
                        className="hover:bg-plum/5 cursor-pointer transition-all group"
                      >
                        <td className="px-8 py-5">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                            ${doc.type === 'question' ? 'bg-green-100 text-green-700 border border-green-200' : 
                              doc.type === 'company' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                              doc.type === 'best_practice' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                              'bg-plum/10 text-plum border border-plum/20'}`}
                          >
                            {doc.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-[15px] font-bold text-plum-dark group-hover:text-[#3A2449] transition-colors">{doc.title}</p>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center space-x-2">
                            <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${
                                  (doc.strictness_override ?? DOCUMENT_TYPES.find(t => t.id === doc.type)?.adherence ?? 50) >= 80 ? 'bg-plum' :
                                  (doc.strictness_override ?? DOCUMENT_TYPES.find(t => t.id === doc.type)?.adherence ?? 50) >= 50 ? 'bg-blue-500' :
                                  'bg-gray-400'
                                }`}
                                style={{ width: `${doc.strictness_override ?? DOCUMENT_TYPES.find(t => t.id === doc.type)?.adherence ?? 50}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                              {doc.strictness_override ?? DOCUMENT_TYPES.find(t => t.id === doc.type)?.adherence ?? 50}%
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm text-gray-400">
                          {doc.updatedAt}
                        </td>
                        <td className="px-8 py-5">
                          <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest
                            ${doc.status === 'active' ? 'bg-gray-100 text-gray-600 border border-gray-200' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}
                          >
                            {doc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredDocs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center text-gray-300 font-medium font-bold uppercase tracking-widest">
                          No matching documents found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-8 py-4 bg-plum/5 border-t border-plum/5 flex items-center justify-between mt-auto">
                    <p className="text-xs text-plum/40 font-bold uppercase tracking-widest">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredDocs.length)} of {filteredDocs.length}
                    </p>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className={`p-2 rounded-lg border transition-all ${currentPage === 1 ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-plum-dark border-plum/10 hover:bg-white hover:border-plum/30'}`}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div className="flex items-center px-4 py-1.5 bg-white border border-plum/10 rounded-lg text-xs font-bold text-plum-dark">
                        Page {currentPage} of {totalPages}
                      </div>
                      <button 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className={`p-2 rounded-lg border transition-all ${currentPage === totalPages ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-plum-dark border-plum/10 hover:bg-white hover:border-plum/30'}`}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Side Drawer: Create/Edit */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-500 ${isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-plum-dark/20 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
        <aside className={`absolute top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl border-l border-plum/10 transition-transform duration-500 ease-out transform ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="h-full flex flex-col">
            <div className="p-8 border-b border-plum/5 flex items-center justify-between bg-plum/5">
              <div className="flex items-center space-x-3 text-plum/40">
                {drawerMode === 'create' ? <PlusCircle size={18} /> : <Edit3 size={18} />}
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{drawerMode === 'create' ? 'Add New Document' : 'Edit Document'}</span>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-plum/10 rounded-full transition-all text-plum/40 hover:text-plum-dark hover:rotate-90">
                <X size={20} />
              </button>
            </div>

            <div ref={drawerScrollRef} className="flex-grow overflow-y-auto p-10 space-y-8">
              {drawerMode === 'edit' && (
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                  Last Updated: {formData.updatedAt}
                </div>
              )}

              {/* Type Selection */}
              <div>
                <label className="text-xs font-bold text-plum/40 uppercase tracking-[0.2em] mb-1 block">Document Type</label>
                {currentTypeInfo && (
                  <p className="text-sm text-gray-400 mb-3">{currentTypeInfo.subtext}</p>
                )}
                <div className="relative mb-8">
                  <select 
                    className="w-full bg-plum/5 border border-plum/10 rounded-xl px-4 py-3 text-plum-dark focus:outline-none focus:border-[#3A2449]/50 transition-all appearance-none cursor-pointer shadow-sm font-bold pr-10"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                    disabled={drawerMode === 'edit'}
                  >
                    {DOCUMENT_TYPES.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                  <Filter size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-plum/40 pointer-events-none" />
                </div>

                {currentTypeInfo && (
                  <div className="bg-plum/5 rounded-2xl p-6 border border-plum/5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 group relative">
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${
                            (formData.strictness_override ?? currentTypeInfo.adherence) >= 80 ? 'text-plum' :
                            (formData.strictness_override ?? currentTypeInfo.adherence) >= 50 ? 'text-blue-500' :
                            'text-gray-400'
                          }`}>
                            Adherence: {formData.strictness_override ?? currentTypeInfo.adherence}%
                          </span>
                          <div className="relative group inline-flex items-center">
                            <Info size={12} className="text-plum/30 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-plum-dark text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-normal w-48 z-50 shadow-lg text-center leading-normal">
                              Controls how closely the coach must follow this guidance. Low = reference material the coach can adapt freely. High = must follow exactly as written.
                            </div>
                          </div>
                        </div>
                        {formData.strictness_override !== null && formData.strictness_override !== currentTypeInfo.adherence && (
                          <span className="text-[8px] font-bold text-plum/30 uppercase tracking-tighter">(Override)</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="w-full flex flex-col gap-2">
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="1"
                        value={formData.strictness_override ?? currentTypeInfo.adherence}
                        onChange={(e) => setFormData({ ...formData, strictness_override: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-plum/10 rounded-lg appearance-none cursor-pointer accent-plum"
                      />
                      <div className="flex justify-between w-full">
                        <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Flexible (0%)</span>
                        <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Strict (100%)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-plum/40 uppercase tracking-[0.2em] mb-2 block">Title <span className="text-[#E84855]">*</span></label>
                <input 
                  type="text"
                  placeholder={formData.type === 'question' ? "Brief description of the question" : "e.g., CIRCLES Method for Product Design"}
                  className={`w-full bg-white border ${errors.title ? 'border-[#E84855]' : 'border-plum/10'} rounded-xl px-4 py-3 text-plum-dark focus:outline-none focus:border-[#3A2449]/50 transition-all shadow-sm font-medium`}
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
                {errors.title && <p className="text-[#E84855] text-[10px] mt-1 font-bold">{errors.title}</p>}
              </div>

              {/* Type-Specific Fields */}
              {formData.type === 'question' && (
                <div className="space-y-8">
                  <div>
                    <label className="text-xs font-bold text-plum/40 uppercase tracking-[0.2em] mb-2 block">Question <span className="text-[#E84855]">*</span></label>
                    <textarea 
                      placeholder="Enter the full question text"
                      className={`w-full bg-white border ${errors.content ? 'border-[#E84855]' : 'border-plum/10'} rounded-xl px-4 py-3 text-plum-dark focus:outline-none focus:border-[#3A2449]/50 transition-all min-h-[100px] resize-none shadow-sm font-medium`}
                      value={formData.content}
                      onChange={(e) => setFormData({...formData, content: e.target.value})}
                    />
                    {errors.content && <p className="text-[#E84855] text-[10px] mt-1 font-bold">{errors.content}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-plum/40 uppercase tracking-[0.2em] mb-2 block">Example Answer (Optional)</label>
                    <textarea 
                      placeholder="Example of a great answer"
                      className="w-full bg-white border border-plum/10 rounded-xl px-4 py-3 text-plum-dark focus:outline-none focus:border-[#3A2449]/50 transition-all min-h-[120px] resize-none shadow-sm font-medium"
                      value={formData.exampleAnswer}
                      onChange={(e) => setFormData({...formData, exampleAnswer: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-plum/40 uppercase tracking-[0.2em] mb-2 block">Why It's Strong (Optional)</label>
                    <textarea 
                      placeholder="What makes this answer effective"
                      className="w-full bg-white border border-plum/10 rounded-xl px-4 py-3 text-plum-dark focus:outline-none focus:border-[#3A2449]/50 transition-all min-h-[100px] resize-none shadow-sm font-medium"
                      value={formData.whyItsStrong}
                      onChange={(e) => setFormData({...formData, whyItsStrong: e.target.value})}
                    />
                  </div>
                  <MultiSelect label="Roles" options={ROLES} selected={formData.roles} error={errors.roles} onToggle={(val: string) => toggleSelection('roles', val)} onSelectAll={() => selectAll('roles')} />
                  <MultiSelect label="Stage" options={STAGES} selected={formData.stages} error={errors.stages} onToggle={(val: string) => toggleSelection('stages', val)} onSelectAll={() => selectAll('stages')} />
                </div>
              )}

              {formData.type === 'company' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-bold text-plum/40 uppercase tracking-[0.2em] mb-2 block">Company Name <span className="text-[#E84855]">*</span></label>
                      <input 
                        type="text"
                        placeholder="e.g., Google"
                        className={`w-full bg-white border ${errors.companyName ? 'border-[#E84855]' : 'border-plum/10'} rounded-xl px-4 py-3 text-plum-dark focus:outline-none focus:border-[#3A2449]/50 transition-all shadow-sm font-medium`}
                        value={formData.companyName}
                        onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                      />
                      {errors.companyName && <p className="text-[#E84855] text-[10px] mt-1 font-bold">{errors.companyName}</p>}
                    </div>
                    <div>
                      <label className="text-xs font-bold text-plum/40 uppercase tracking-[0.2em] mb-2 block">Industry <span className="text-[#E84855]">*</span></label>
                      <select 
                        className={`w-full bg-white border ${errors.industry ? 'border-[#E84855]' : 'border-plum/10'} rounded-xl px-4 py-3 text-plum-dark focus:outline-none focus:border-[#3A2449]/50 transition-all appearance-none cursor-pointer shadow-sm font-medium`}
                        value={formData.industry}
                        onChange={(e) => setFormData({...formData, industry: e.target.value})}
                      >
                        <option value="">Select Industry</option>
                        {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                      {errors.industry && <p className="text-[#E84855] text-[10px] mt-1 font-bold">{errors.industry}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-plum/40 uppercase tracking-[0.2em] mb-2 block">What They Look For <span className="text-[#E84855]">*</span></label>
                    <textarea 
                      placeholder="Information on hiring practices and company culture"
                      className={`w-full bg-white border ${errors.content ? 'border-[#E84855]' : 'border-plum/10'} rounded-xl px-4 py-3 text-plum-dark focus:outline-none focus:border-[#3A2449]/50 transition-all min-h-[150px] resize-none shadow-sm font-medium`}
                      value={formData.content}
                      onChange={(e) => setFormData({...formData, content: e.target.value})}
                    />
                    {errors.content && <p className="text-[#E84855] text-[10px] mt-1 font-bold">{errors.content}</p>}
                  </div>
                  <MultiSelect label="Roles" options={ROLES} selected={formData.roles} error={errors.roles} onToggle={(val: string) => toggleSelection('roles', val)} onSelectAll={() => selectAll('roles')} />
                </div>
              )}

              {formData.type === 'best_practice' && (
                <div className="space-y-8">
                  <div>
                    <label className="text-xs font-bold text-plum/40 uppercase tracking-[0.2em] mb-2 block">Topic <span className="text-[#E84855]">*</span></label>
                    <input 
                      type="text"
                      placeholder="e.g., Career Transition, Salary Negotiation"
                      className={`w-full bg-white border ${errors.topic ? 'border-[#E84855]' : 'border-plum/10'} rounded-xl px-4 py-3 text-plum-dark focus:outline-none focus:border-[#3A2449]/50 transition-all shadow-sm font-medium`}
                      value={formData.topic}
                      onChange={(e) => setFormData({...formData, topic: e.target.value})}
                    />
                    {errors.topic && <p className="text-[#E84855] text-[10px] mt-1 font-bold">{errors.topic}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-plum/40 uppercase tracking-[0.2em] mb-2 block">Overview <span className="text-[#E84855]">*</span></label>
                    <textarea 
                      placeholder="Best practices, approaches, red flags, etc."
                      className={`w-full bg-white border ${errors.content ? 'border-[#E84855]' : 'border-plum/10'} rounded-xl px-4 py-3 text-plum-dark focus:outline-none focus:border-[#3A2449]/50 transition-all min-h-[200px] resize-none shadow-sm font-medium`}
                      value={formData.content}
                      onChange={(e) => setFormData({...formData, content: e.target.value})}
                    />
                    {errors.content && <p className="text-[#E84855] text-[10px] mt-1 font-bold">{errors.content}</p>}
                  </div>
                  <MultiSelect label="Roles" options={ROLES} selected={formData.roles} onToggle={(val: string) => toggleSelection('roles', val)} onSelectAll={() => selectAll('roles')} />
                  <MultiSelect label="Stage" options={STAGES} selected={formData.stages} onToggle={(val: string) => toggleSelection('stages', val)} onSelectAll={() => selectAll('stages')} />
                </div>
              )}

              {formData.type === 'framework' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-bold text-plum/40 uppercase tracking-[0.2em] mb-2 block">Framework Name <span className="text-[#E84855]">*</span></label>
                      <input 
                        type="text"
                        placeholder="e.g., CIRCLES Method"
                        className={`w-full bg-white border ${errors.frameworkName ? 'border-[#E84855]' : 'border-plum/10'} rounded-xl px-4 py-3 text-plum-dark focus:outline-none focus:border-[#3A2449]/50 transition-all shadow-sm font-medium`}
                        value={formData.frameworkName}
                        onChange={(e) => setFormData({...formData, frameworkName: e.target.value})}
                      />
                      {errors.frameworkName && <p className="text-[#E84855] text-[10px] mt-1 font-bold">{errors.frameworkName}</p>}
                    </div>
                    <div>
                      <label className="text-xs font-bold text-plum/40 uppercase tracking-[0.2em] mb-2 block">Framework Type <span className="text-[#E84855]">*</span></label>
                      <select 
                        className={`w-full bg-white border ${errors.frameworkType ? 'border-[#E84855]' : 'border-plum/10'} rounded-xl px-4 py-3 text-plum-dark focus:outline-none focus:border-[#3A2449]/50 transition-all appearance-none cursor-pointer shadow-sm font-medium`}
                        value={formData.frameworkType}
                        onChange={(e) => setFormData({...formData, frameworkType: e.target.value})}
                      >
                        <option value="">Select Type</option>
                        {FRAMEWORK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      {errors.frameworkType && <p className="text-[#E84855] text-[10px] mt-1 font-bold">{errors.frameworkType}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-plum/40 uppercase tracking-[0.2em] mb-2 block">Overview <span className="text-[#E84855]">*</span></label>
                    <textarea 
                      placeholder="Framework details, steps, when to use"
                      className={`w-full bg-white border ${errors.content ? 'border-[#E84855]' : 'border-plum/10'} rounded-xl px-4 py-3 text-plum-dark focus:outline-none focus:border-[#3A2449]/50 transition-all min-h-[200px] resize-none shadow-sm font-medium`}
                      value={formData.content}
                      onChange={(e) => setFormData({...formData, content: e.target.value})}
                    />
                    {errors.content && <p className="text-[#E84855] text-[10px] mt-1 font-bold">{errors.content}</p>}
                  </div>
                  <MultiSelect label="Roles" options={ROLES} selected={formData.roles} onToggle={(val: string) => toggleSelection('roles', val)} onSelectAll={() => selectAll('roles')} />
                  <MultiSelect label="Stage" options={STAGES} selected={formData.stages} onToggle={(val: string) => toggleSelection('stages', val)} onSelectAll={() => selectAll('stages')} />
                </div>
              )}
            </div>

            <div className="p-8 border-t border-plum/5 bg-plum/5 flex items-center justify-end space-x-4">
              <button onClick={() => setIsDrawerOpen(false)} className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-plum/40 hover:text-plum-dark transition-all">Cancel</button>
              <button 
                onClick={() => handleSave('draft')} 
                disabled={isSaving}
                className="bg-gray-200 text-gray-600 hover:bg-gray-300 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
              <button 
                className="bg-[#3A2449] text-white py-2 px-8 rounded-xl font-bold hover:bg-[#2D1B3D] transition-all text-sm uppercase tracking-widest disabled:opacity-50" 
                onClick={() => handleSave('active')}
                disabled={isSaving}
              >
                {isSaving ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Side Drawer: Detail */}
      <div className={`fixed inset-0 z-40 transition-opacity duration-500 ${selectedDoc ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-plum-dark/20 backdrop-blur-sm" onClick={() => setSelectedDoc(null)} />
        <aside className={`absolute top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl border-l border-plum/10 transition-transform duration-500 ease-out transform ${selectedDoc ? 'translate-x-0' : 'translate-x-full'}`}>
          {selectedDoc && (
            <div className="h-full flex flex-col">
              <div className="p-8 border-b border-plum/5 flex items-center justify-between bg-plum/5">
                <div className="flex items-center space-x-3 text-plum/40">
                  <FileText size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{selectedDoc.type.replace('_', ' ')} Detail</span>
                </div>
                <button onClick={() => setSelectedDoc(null)} className="p-2 hover:bg-plum/10 rounded-full transition-all text-plum/40 hover:text-plum-dark hover:rotate-90">
                  <X size={20} />
                </button>
              </div>

              <div ref={detailScrollRef} className="flex-grow overflow-y-auto p-10">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Clock size={12} /> Last Updated: {selectedDoc.updatedAt}
                </div>
                <h2 className="text-3xl font-bold text-plum-dark mb-8 leading-tight">{selectedDoc.title}</h2>
                <div className="space-y-10">
                  <div>
                    <h3 className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em] mb-4">Content</h3>
                    <div className="bg-plum/5 rounded-2xl p-8 text-gray-700 leading-relaxed text-base border border-plum/5 font-medium whitespace-pre-wrap">
                      {selectedDoc.content}
                    </div>
                  </div>

                  {(selectedDoc.roles?.length || selectedDoc.stages?.length) && (
                    <div className="grid grid-cols-2 gap-8">
                      {selectedDoc.roles && (
                        <div>
                          <h3 className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em] mb-4">Roles</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedDoc.roles.map(role => (
                              <span key={role} className="bg-plum/5 text-plum/60 px-4 py-1.5 rounded-full text-xs font-bold border border-plum/10">{role}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedDoc.stages && (
                        <div>
                          <h3 className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em] mb-4">Stages</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedDoc.stages.map(stage => (
                              <span key={stage} className="bg-plum/5 text-plum/60 px-4 py-1.5 rounded-full text-xs font-bold border border-plum/10">{stage}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedDoc.type === 'question' && (selectedDoc.exampleAnswer || selectedDoc.whyItsStrong) && (
                    <div className="space-y-8">
                      {selectedDoc.exampleAnswer && (
                        <div>
                          <h3 className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em] mb-4">Example Answer</h3>
                          <div className="bg-green-50/50 rounded-2xl p-6 text-gray-700 text-sm border border-green-100 font-medium whitespace-pre-wrap italic">
                            "{selectedDoc.exampleAnswer}"
                          </div>
                        </div>
                      )}
                      {selectedDoc.whyItsStrong && (
                        <div>
                          <h3 className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em] mb-4">Why It's Strong</h3>
                          <div className="bg-blue-50/50 rounded-2xl p-6 text-gray-700 text-sm border border-blue-100 font-medium whitespace-pre-wrap">
                            {selectedDoc.whyItsStrong}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <h3 className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em] mb-4">Status & Intelligence</h3>
                    <div className="flex items-center space-x-6">
                      <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${selectedDoc.status === 'active' ? 'bg-[#3A2449] text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}>
                        {selectedDoc.status}
                      </span>
                      <div className="flex items-center space-x-3">
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                          Adherence:
                        </span>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 h-1.5 bg-plum/5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${
                                (selectedDoc.strictness_override ?? DOCUMENT_TYPES.find(t => t.id === selectedDoc.type)?.adherence ?? 50) >= 80 ? 'bg-plum' :
                                (selectedDoc.strictness_override ?? DOCUMENT_TYPES.find(t => t.id === selectedDoc.type)?.adherence ?? 50) >= 50 ? 'bg-blue-500' :
                                'bg-gray-400'
                              }`}
                              style={{ width: `${selectedDoc.strictness_override ?? DOCUMENT_TYPES.find(t => t.id === selectedDoc.type)?.adherence ?? 50}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-plum-dark">
                            {selectedDoc.strictness_override ?? DOCUMENT_TYPES.find(t => t.id === selectedDoc.type)?.adherence ?? 50}%
                          </span>
                          {selectedDoc.strictness_override !== null && selectedDoc.strictness_override !== DOCUMENT_TYPES.find(t => t.id === selectedDoc.type)?.adherence && (
                            <span className="text-[8px] font-bold text-plum/30 uppercase tracking-tighter">(Override)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-plum/5 bg-plum/5 flex items-center justify-between">
                <button onClick={() => handleDelete(selectedDoc.id)} className="flex items-center space-x-2 text-[#3A2449] hover:scale-105 transition-transform text-sm font-bold uppercase tracking-widest">
                  <Trash2 size={18} />
                  <span>Delete</span>
                </button>
                <div className="flex space-x-4">
                  <button onClick={() => openEditDrawer(selectedDoc)} className="bg-white border border-plum/20 text-plum-dark hover:bg-plum/5 py-2 px-6 rounded-xl font-semibold transition-all text-sm flex items-center gap-2">
                    <Edit3 size={16} />
                    Edit
                  </button>
                  <button className="bg-[#3A2449] text-white py-2 px-6 rounded-xl font-semibold shadow-sm hover:bg-[#2D1B3D] transition-all text-sm flex items-center gap-2">
                    <ExternalLink size={14} />
                    Preview
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Guidelines Modal */}
      {isGuidelinesModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-plum-dark/40 backdrop-blur-md" onClick={() => setIsGuidelinesModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl border border-plum/10 w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-plum/5 flex items-center justify-between bg-plum/5">
              <div className="flex items-center space-x-3 text-plum-dark">
                <Info size={24} />
                <h2 className="text-xl font-bold">Knowledge Base Content Guidelines</h2>
              </div>
              <button 
                onClick={() => setIsGuidelinesModalOpen(false)} 
                className="p-2 hover:bg-plum/10 rounded-full transition-all text-plum/40 hover:text-plum-dark"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto">
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-plum/40 uppercase tracking-widest">Why Quality Matters</h3>
                <p className="text-sm text-gray-600 leading-relaxed font-medium">
                  Our system uses <span className="text-plum-dark font-bold">Retrieval-Augmented Generation (RAG)</span>. When a user interacts with the {agentConfig.agentName}, the database is searched for semantically similar content. The database cannot judge whether a document is "good" or "bad"—it only knows if it is relevant to the current conversation.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-bold text-plum/40 uppercase tracking-widest">Review Workflow</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { step: '1', title: 'Draft', desc: 'Create and refine content' },
                    { step: '2', title: 'Review', desc: 'Expert validation of accuracy' },
                    { step: '3', title: 'Publish', desc: 'Live for coaching sessions' },
                  ].map((item) => (
                    <div key={item.step} className="bg-plum/5 p-4 rounded-2xl border border-plum/5 text-center">
                      <div className="w-8 h-8 bg-plum-dark text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-xs">{item.step}</div>
                      <h4 className="text-xs font-bold text-plum-dark mb-1">{item.title}</h4>
                      <p className="text-[10px] text-gray-500 font-medium leading-tight">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-bold text-plum/40 uppercase tracking-widest">Best Practices</h3>
                <ul className="space-y-2">
                  {[
                    `Ensure every "Active" document has been reviewed by an ${agentConfig.orgName} expert.`,
                    'Keep documents focused on a single topic or company process.',
                    'Perform regular audits of published content to ensure relevance.',
                    'Immediately delete or archive outdated or incorrect information.',
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start space-x-3 text-sm text-gray-600 font-medium">
                      <div className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-plum" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-3 bg-plum/5 p-6 rounded-2xl border border-plum/5">
                <h3 className="text-sm font-bold text-plum-dark uppercase tracking-widest">Status Explanation</h3>
                <div className="space-y-4">
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-gray-100 text-gray-600 border border-gray-200 mb-2">Active</span>
                    <p className="text-xs text-gray-500 font-medium">Content is indexed and used by the {agentConfig.agentName} to guide user interviews and provide feedback.</p>
                  </div>
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-gray-50 text-gray-400 border border-gray-100 mb-2">Draft</span>
                    <p className="text-xs text-gray-500 font-medium">Content is saved but NOT indexed. Use this for ongoing work or documents awaiting review.</p>
                  </div>
                </div>
              </section>
            </div>

            <div className="p-8 border-t border-plum/5 bg-plum/5 flex items-center justify-end">
              <button 
                onClick={() => setIsGuidelinesModalOpen(false)}
                className="bg-[#3A2449] text-white py-3 px-10 rounded-2xl font-bold hover:bg-[#2D1B3D] transition-all text-sm shadow-md"
              >
                Got it, thanks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-plum-dark/40 backdrop-blur-md" onClick={() => { setIsImportModalOpen(false); fetchDocuments(); }} />
          <div className="relative bg-white rounded-3xl shadow-2xl border border-plum/10 w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-plum/5 flex items-center justify-between bg-plum/5">
              <div className="flex items-center space-x-3 text-plum-dark">
                <Upload size={24} />
                <h2 className="text-xl font-bold">Import CSV</h2>
              </div>
              <button 
                onClick={() => { setIsImportModalOpen(false); fetchDocuments(); }}
                className="p-2 hover:bg-plum/10 rounded-full transition-all text-plum/40 hover:text-plum-dark"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="text-xs font-bold text-plum/40 uppercase tracking-[0.2em] mb-2 block">CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-plum/10 file:text-plum-dark file:font-semibold file:cursor-pointer hover:file:bg-plum/20"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="bg-plum/5 rounded-2xl p-4 border border-plum/5 space-y-2 text-sm text-gray-600">
                <p className="font-bold text-plum-dark text-xs uppercase tracking-widest">Format guide</p>
                <p>CSV Format: title, type, content, roles, stages, strictness_override</p>
                <p>Roles and stages are semicolon-separated.</p>
                <p>Type must be: question, company, best_practice, or framework.</p>
                <p>Any extra columns are stored as metadata.</p>
              </div>
              <a
                href="/kb-import-template.csv"
                download="kb-import-template.csv"
                className="inline-flex items-center gap-2 text-sm font-semibold text-plum-dark hover:text-[#2D1B3D] hover:underline"
              >
                <FileText size={16} />
                Download Template
              </a>
              {importResult !== null && (
                <div className="rounded-2xl border border-plum/10 p-4 space-y-2 bg-white">
                  <p className="text-sm font-bold text-plum-dark">Results</p>
                  <p className="text-sm text-gray-600">
                    <span className="text-green-600 font-semibold">{importResult.imported} imported</span>
                    {importResult.failed > 0 && (
                      <span className="text-red-600 font-semibold">, {importResult.failed} failed</span>
                    )}
                  </p>
                  {importResult.errors.length > 0 && (
                    <ul className="text-xs text-red-600 list-disc list-inside max-h-32 overflow-y-auto space-y-1">
                      {importResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="p-8 border-t border-plum/5 bg-plum/5 flex items-center justify-end gap-3">
              <button
                onClick={() => { setIsImportModalOpen(false); fetchDocuments(); }}
                className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-plum/40 hover:text-plum-dark transition-all"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  if (!importFile) return;
                  setIsImporting(true);
                  setImportResult(null);
                  try {
                    const form = new FormData();
                    form.append('file', importFile);
                    const res = await fetch('/api/admin/documents/import', { method: 'POST', body: form });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Import failed');
                    setImportResult({ imported: data.imported, failed: data.failed, errors: data.errors || [] });
                  } catch (err: any) {
                    setImportResult({ imported: 0, failed: 0, errors: [err?.message || 'Import failed'] });
                  } finally {
                    setIsImporting(false);
                  }
                }}
                disabled={!importFile || isImporting}
                className="bg-[#3A2449] text-white py-3 px-8 rounded-2xl font-bold hover:bg-[#2D1B3D] transition-all text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Import
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
