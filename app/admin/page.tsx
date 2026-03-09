'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Database, Sliders, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import KnowledgeBaseTab from '@/components/admin/KnowledgeBaseTab';
import TestConsoleTab from '@/components/admin/TestConsoleTab';
import PromptControlTab from '@/components/admin/PromptControlTab';
import SystemHealthTab from '@/components/admin/SystemHealthTab';

type AdminTab = 'kb' | 'test' | 'prompt' | 'system-health';

const TOGGLE_TABS: { id: AdminTab; label: string; icon: typeof Database }[] = [
  { id: 'kb', label: 'Knowledge Base', icon: Database },
  { id: 'prompt', label: 'Prompt Control', icon: Sliders },
];

function AdminPageContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as AdminTab | null;
  const validTab = (tabParam === 'kb' || tabParam === 'test' || tabParam === 'prompt' || tabParam === 'system-health') ? tabParam : 'kb';
  const [activeTab, setActiveTab] = useState<AdminTab>(validTab);

  useEffect(() => {
    setActiveTab(validTab);
  }, [validTab]);

  const setTab = (tab: AdminTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.pathname + url.search);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-gray-900">
      {/* Tab bar */}
      <div className="sticky top-0 z-30 border-b border-plum/10 bg-white/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-8 pt-6 pb-0">
          <div className="flex items-center gap-6 mb-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-plum/60 hover:text-plum-dark transition-colors text-sm font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to app
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {/* Knowledge Base | Prompt Control toggles */}
            <div className="flex gap-1 p-1 bg-plum/5 rounded-xl border border-plum/10">
              {TOGGLE_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${
                      activeTab === tab.id
                        ? 'bg-plum-dark text-white shadow-md'
                        : 'text-plum/60 hover:text-plum-dark hover:bg-plum/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            {/* Test Console as its own button */}
            <button
              onClick={() => setTab('test')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl border text-sm font-bold transition-all ${
                activeTab === 'test'
                  ? 'bg-plum-dark text-white border-plum-dark shadow-md'
                  : 'border-plum/20 text-plum/60 hover:text-plum-dark hover:border-plum/40 hover:bg-plum/5'
              }`}
            >
              Test Console
              <ChevronRight className="w-4 h-4" />
            </button>
            {/* System Health — inline tab, same pattern as Test Console */}
            <button
              onClick={() => setTab('system-health')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl border text-sm font-bold transition-all ${
                activeTab === 'system-health'
                  ? 'bg-plum-dark text-white border-plum-dark shadow-md'
                  : 'border-plum/20 text-plum/60 hover:text-plum-dark hover:border-plum/40 hover:bg-plum/5'
              }`}
            >
              <Activity className="w-4 h-4" />
              System Health
            </button>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-7xl mx-auto">
        {activeTab === 'kb' && <KnowledgeBaseTab />}
        {activeTab === 'test' && <TestConsoleTab />}
        {activeTab === 'prompt' && <PromptControlTab />}
        {activeTab === 'system-health' && <SystemHealthTab />}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center text-plum-dark font-bold">Loading...</div>}>
      <AdminPageContent />
    </Suspense>
  );
}
