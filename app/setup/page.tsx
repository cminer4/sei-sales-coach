'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Upload, FileText, X, Loader2, Mic, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import { agentConfig } from '@/lib/agentConfig';

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micTestResult, setMicTestResult] = useState<'success' | 'error' | null>(null);
  const [testVolume, setTestVolume] = useState(0);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const loadingPhrases = agentConfig.onboarding.loadingMessages;

  useEffect(() => {
    if (isSyncing) {
      const interval = setInterval(() => {
        setLoadingPhraseIndex((prev) => (prev + 1) % loadingPhrases.length);
      }, 2500);
      return () => clearInterval(interval);
    } else {
      setLoadingPhraseIndex(0);
    }
  }, [isSyncing, loadingPhrases.length]);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isIncognito, setIsIncognito] = useState(false);
  const [formData, setFormData] = useState({
    role: '',
    jobDescription: '',
    resumeText: '',
    resumeFile: null as File | null,
    preferredName: '',
    company: '',
    interviewType: '',
    duration: '',
    interactionMode: 'text' as 'voice' | 'text',
  });

  useEffect(() => {
    // Basic incognito detection
    const checkIncognito = async () => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const { quota } = await navigator.storage.estimate();
        if (quota && quota < 120000000) {
          setIsIncognito(true);
        }
      }
    };
    checkIncognito();
  }, []);

  useEffect(() => {
    // Cleanup mic if moving away from step 4 or on unmount
    const cleanup = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };

    if (step !== 4) {
      cleanup();
      setMicTestResult(null);
      setIsTestingMic(false);
      setTestVolume(0);
    }

    return cleanup;
  }, [step]);

  const handleTestMic = async () => {
    // Stop any existing test
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setIsTestingMic(true);
    setMicTestResult(null);
    setTestVolume(0);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const startTime = Date.now();
      let hasReportedSuccess = false;
      
      const checkVolume = () => {
        // Stop if the stream or context was closed
        if (!streamRef.current || !audioContextRef.current || audioContext.state === 'closed') return;

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setTestVolume(average);

        if (average > 15 && !hasReportedSuccess) {
          hasReportedSuccess = true;
          setMicTestResult('success');
          // We don't stop the stream yet - we keep the visualizer running
        }

        // Timeout if no sound after 10s and no success yet
        if (!hasReportedSuccess && Date.now() - startTime > 10000) {
          setMicTestResult('error');
          setIsTestingMic(false);
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
          return;
        }

        requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.error('Microphone test failed:', err);
      setMicTestResult('error');
      setIsTestingMic(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const syncOnboardingData = async (currentData: any) => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/onboarding/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...currentData,
          sessionId,
        }),
      });
      const result = await response.json();
      if (result.sessionId) {
        setSessionId(result.sessionId);
        // Also update local storage with the sessionId
        const localData = JSON.parse(localStorage.getItem('onboarding-data') || '{}');
        localStorage.setItem('onboarding-data', JSON.stringify({
          ...localData,
          ...currentData, // Ensure all current data is saved
          sessionId: result.sessionId
        }));
      }
    } catch (error) {
      console.error('Failed to sync onboarding data:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleNext = async () => {
    // Sync data before moving to next step
    await syncOnboardingData(formData);
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleStartCoaching = async () => {
    // Final sync before starting
    await syncOnboardingData(formData);
    
    // Stop any active mic test
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    // Note: sessionId is already updated in syncOnboardingData
    localStorage.setItem('onboarding-data', JSON.stringify({
      ...formData,
      sessionId
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError(null);
    setFormData({ ...formData, resumeFile: file });

    try {
      const arrayBuffer = await file.arrayBuffer();
      let extractedText = '';

      if (file.name.endsWith('.docx')) {
        const mammoth = (await import('mammoth')).default;
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } else if (file.name.endsWith('.pdf')) {
        const pdfjs = await import('pdfjs-dist');
        const url = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        console.log('PDF.js Version:', pdfjs.version);
        console.log('Setting PDF worker URL to:', url);
        pdfjs.GlobalWorkerOptions.workerSrc = url;
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .filter((item: any) => 'str' in item)
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + '\n';
        }
        extractedText = fullText;
      } else if (file.name.endsWith('.txt')) {
        extractedText = await file.text();
      } else if (file.name.endsWith('.doc')) {
        throw new Error('Old Word (.doc) format is not supported. Please save as .docx or .pdf');
      } else {
        throw new Error('Unsupported file format. Please upload .pdf, .docx, or .txt');
      }

      if (!extractedText.trim()) {
        throw new Error('Could not extract text from the file. It might be empty or scanned images.');
      }

      setFormData(prev => ({ ...prev, resumeText: extractedText }));
    } catch (error: any) {
      console.error('File parsing error:', error);
      setParseError(error.message || 'Failed to parse the file');
      setFormData(prev => ({ ...prev, resumeFile: null }));
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <main className="min-h-screen bg-textured-gradient flex flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-12">
          {step === 1 ? (
            <Link href="/" className="inline-flex items-center text-white/60 hover:text-white transition-colors group">
              <ChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Link>
          ) : (
            <button onClick={handleBack} className="inline-flex items-center text-white/60 hover:text-white transition-colors group">
              <ChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back
            </button>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 min-h-[600px] flex flex-col relative overflow-hidden"
        >
          <AnimatePresence mode="wait">
            {isSyncing ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="flex-grow flex flex-col items-center justify-center text-center space-y-8"
              >
                <div className="relative">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: 360 
                    }}
                    transition={{ 
                      scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                      rotate: { duration: 3, repeat: Infinity, ease: "linear" }
                    }}
                    className="w-24 h-24 rounded-full border-4 border-white/10 border-t-white relative"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-plum/20 rounded-full blur-xl"
                  />
                </div>
                
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-white">Preparing your experience...</h2>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={loadingPhraseIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-white/60 font-medium"
                    >
                      {loadingPhrases[loadingPhraseIndex]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col flex-grow"
              >
                <div className="mb-12">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold uppercase tracking-wider text-gradient-red">Step {step} of 4</span>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((s) => (
                        <div
                          key={s}
                          className={`w-12 h-1 rounded-full ${
                            s <= step ? 'bg-gradient-primary' : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <h1 className="text-3xl font-bold">
                    {step === 1 && "Tell us about the role"}
                    {step === 2 && "Tell us about you"}
                    {step === 3 && "What's your scenario?"}
                    {step === 4 && "How would you like to practice?"}
                  </h1>
                </div>

                <div className="space-y-8 flex-grow">
                  {step === 1 && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-white/60 mb-2">Job Title</label>
                        <input
                          type="text"
                          placeholder="e.g. Senior Software Engineer"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-xl focus:outline-none focus:border-white/30 transition-colors"
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white/60 mb-2">Company Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Google, Stripe, etc."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-xl focus:outline-none focus:border-white/30 transition-colors"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white/60 mb-2">Job Description (Optional)</label>
                        <textarea
                          placeholder={agentConfig.onboarding.jobDescriptionPlaceholder}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-lg focus:outline-none focus:border-white/30 transition-colors min-h-[200px] resize-none"
                          value={formData.jobDescription}
                          onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-6">
                      <div className="pb-8 border-b border-white/5">
                        <label className="block text-sm font-medium text-white/60 mb-2">What should we call you?</label>
                        <input
                          type="text"
                          placeholder="e.g., Steve, Audrey, Tommy, etc..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-xl focus:outline-none focus:border-white/30 transition-colors"
                          value={formData.preferredName}
                          onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
                        />
                        <p className="mt-2 text-xs text-white/40">We'll use this to make the experience feel more personal</p>
                      </div>

                      <div className="w-full pt-4">
                        <label className="block text-sm font-medium text-white/60 mb-2">Upload Resume (PDF, DOCX)</label>
                        <p className="text-[10px] text-white/30 mb-4 uppercase tracking-widest font-bold">Supported formats: PDF, Word, or paste text directly</p>
                        
                        {!formData.resumeFile ? (
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isParsing}
                            className={`w-full border-2 border-dotted border-white/20 rounded-2xl p-8 flex flex-col items-center hover:bg-white/5 hover:border-white/40 transition-all group ${isParsing ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {isParsing ? (
                              <>
                                <Loader2 className="w-8 h-8 text-white/20 animate-spin mb-3" />
                                <span className="text-base font-medium text-white/40">Parsing your resume...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-8 h-8 text-white/20 group-hover:text-white/40 mb-3" />
                                <span className="text-base font-medium text-white/40 group-hover:text-white/60">Choose file or drag and drop</span>
                              </>
                            )}
                            <input
                              type="file"
                              ref={fileInputRef}
                              className="hidden"
                              accept=".pdf,.docx,.doc,.txt"
                              onChange={handleFileChange}
                            />
                          </button>
                        ) : (
                          <div className="w-full bg-white/5 border border-white/20 rounded-xl p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <FileText className="w-8 h-8 text-blue-400" />
                              <div>
                                <p className="font-medium text-white line-clamp-1">{formData.resumeFile.name}</p>
                                <p className="text-sm text-white/40">{(formData.resumeFile.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setFormData({ ...formData, resumeFile: null, resumeText: '' });
                                setParseError(null);
                              }}
                              className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                              <X className="w-5 h-5 text-white/40" />
                            </button>
                          </div>
                        )}

                        {parseError && (
                          <p className="mt-4 text-sm text-red-400 text-center font-medium bg-red-400/10 py-2 px-4 rounded-lg border border-red-400/20">
                            {parseError}
                          </p>
                        )}
                      </div>

                      <p className="text-sm text-white/50 italic text-center">
                        {agentConfig.onboarding.resumeHint}
                        {' '}It's not saved or stored anywhere.
                      </p>

                      <div className="pt-4">
                        <label className="block text-sm font-medium text-white/60 mb-2">Or Paste Resume Text</label>
                        <textarea
                          placeholder="Paste your resume content here..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-lg focus:outline-none focus:border-white/30 transition-colors min-h-[200px] resize-none"
                          value={formData.resumeText}
                          onChange={(e) => setFormData({ ...formData, resumeText: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-8">
                      <div>
                        <label className="block text-sm font-medium text-white/60 mb-4">{agentConfig.onboarding.contextTypeLabel}</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {agentConfig.onboarding.contextTypes.map((type) => (
                            <button
                              key={type}
                              onClick={() => setFormData({ ...formData, interviewType: type })}
                              className={`p-6 rounded-xl border transition-all text-left ${
                                formData.interviewType === type
                                  ? 'bg-white/10 border-white/40'
                                  : 'bg-white/5 border-white/10 hover:border-white/20'
                              }`}
                            >
                              <span className="text-lg font-medium">{type}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white/60 mb-4">{agentConfig.onboarding.durationLabel}</label>
                        <div className="space-y-4">
                          {agentConfig.onboarding.durations.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => setFormData({ ...formData, duration: opt.id })}
                              className={`w-full p-6 rounded-xl border transition-all text-left flex gap-6 ${
                                formData.duration === opt.id
                                  ? 'bg-white/10 border-white/40'
                                  : 'bg-white/5 border-white/10 hover:border-white/20'
                              }`}
                            >
                              <div className="flex-grow">
                                <div className="flex items-center gap-3 mb-1">
                                  <span className="text-lg font-bold">{opt.label}</span>
                                  <span className="text-sm text-white/40">({opt.duration})</span>
                                </div>
                                <div className="text-sm text-white/60 mb-2">{opt.stats} • {opt.desc}</div>
                                <div className="text-xs text-white/40 font-medium">Good for: {opt.use}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-4">
                        <button
                          onClick={() => setFormData({ ...formData, interactionMode: 'voice' })}
                          className={`p-6 rounded-2xl border transition-all text-left flex items-start gap-4 ${
                            formData.interactionMode === 'voice'
                              ? 'bg-white/10 border-white/40 ring-1 ring-white/20'
                              : 'bg-white/5 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className={`p-3 rounded-xl ${formData.interactionMode === 'voice' ? 'bg-gradient-primary text-white' : 'bg-white/5 text-white/40'}`}>
                            <Mic className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-xl font-bold block mb-1">{agentConfig.onboarding.voiceOptionLabel}</span>
                            <p className="text-sm text-white/60">{agentConfig.onboarding.voiceOptionDesc}</p>
                            <p className="text-xs text-white/40 mt-2 font-medium italic">(Requires microphone access - not available in incognito mode)</p>
                          </div>
                        </button>

                        <button
                          onClick={() => setFormData({ ...formData, interactionMode: 'text' })}
                          className={`p-6 rounded-2xl border transition-all text-left flex items-start gap-4 ${
                            formData.interactionMode === 'text'
                              ? 'bg-white/10 border-white/40 ring-1 ring-white/20'
                              : 'bg-white/5 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className={`p-3 rounded-xl ${formData.interactionMode === 'text' ? 'bg-gradient-primary text-white' : 'bg-white/5 text-white/40'}`}>
                            <MessageSquare className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-xl font-bold block mb-1">{agentConfig.onboarding.textOptionLabel}</span>
                            <p className="text-sm text-white/60">{agentConfig.onboarding.textOptionDesc}</p>
                          </div>
                        </button>
                      </div>

                      {formData.interactionMode === 'voice' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="pt-4"
                        >
                          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40 mb-4">Microphone Setup</h3>
                            
                            {isIncognito && (
                              <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex gap-3">
                                <AlertCircle className="w-5 h-5 text-orange-400 shrink-0" />
                                <p className="text-sm text-orange-200/80 leading-relaxed">
                                  Voice mode requires a regular browser window. We've detected you might be in incognito mode.
                                </p>
                              </div>
                            )}

                            {micTestResult === 'success' ? (
                              <div className="space-y-4">
                                <div className="flex items-center justify-center gap-3 text-green-400 bg-green-400/10 p-4 rounded-xl border border-green-400/20">
                                  <CheckCircle2 className="w-5 h-5" />
                                  <span className="font-medium">Microphone is working!</span>
                                </div>
                                
                                <div className="space-y-2 py-2">
                                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                      className="h-full bg-green-400/50"
                                      animate={{ width: `${Math.min(100, (testVolume / 50) * 100)}%` }}
                                      transition={{ type: 'spring', bounce: 0, duration: 0.1 }}
                                    />
                                  </div>
                                  <p className="text-[10px] text-center text-green-400/60 uppercase tracking-widest font-bold">
                                    Live audio detected
                                  </p>
                                </div>

                                <button
                                  onClick={() => {
                                    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
                                    if (audioContextRef.current) audioContextRef.current.close();
                                    setMicTestResult(null);
                                    setIsTestingMic(false);
                                    setTestVolume(0);
                                  }}
                                  className="w-full text-xs text-white/40 hover:text-white/60 underline"
                                >
                                  Stop test / Reset
                                </button>
                              </div>
                            ) : !micTestResult ? (
                              <div className="space-y-4">
                                <button
                                  onClick={handleTestMic}
                                  disabled={isTestingMic}
                                  className="w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 py-4 rounded-xl transition-all font-medium disabled:opacity-50"
                                >
                                  {isTestingMic ? (
                                    <>
                                      <Loader2 className="w-5 h-5 animate-spin" />
                                      <span>Listening...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Mic className="w-5 h-5" />
                                      <span>Test Microphone</span>
                                    </>
                                  )}
                                </button>
                                
                                {isTestingMic && (
                                  <div className="space-y-2">
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                      <motion.div 
                                        className="h-full bg-gradient-primary"
                                        animate={{ width: `${Math.min(100, (testVolume / 50) * 100)}%` }}
                                        transition={{ type: 'spring', bounce: 0, duration: 0.1 }}
                                      />
                                    </div>
                                    <p className="text-[10px] text-center text-white/40 uppercase tracking-widest font-bold animate-pulse">
                                      Speak now to test levels...
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="flex items-center gap-3 text-red-400 bg-red-400/10 p-4 rounded-xl border border-red-400/20">
                                  <AlertCircle className="w-5 h-5" />
                                  <span className="font-medium">Couldn't access microphone</span>
                                </div>
                                <p className="text-xs text-white/40">Please ensure you've granted microphone permissions in your browser settings.</p>
                                <button
                                  onClick={handleTestMic}
                                  className="w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 py-4 rounded-xl transition-all font-medium"
                                >
                                  Try again
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-8">
                  {step < 4 ? (
                    <button
                      onClick={handleNext}
                      disabled={
                        isParsing ||
                        isSyncing ||
                        (step === 1 && (!formData.role || !formData.company)) ||
                        (step === 2 && !formData.resumeFile && !formData.resumeText) ||
                        (step === 3 && (!formData.interviewType || !formData.duration))
                      }
                      className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isParsing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Parsing...
                        </>
                      ) : (
                        'Continue'
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        await handleStartCoaching();
                        router.push('/coach');
                      }}
                      disabled={isSyncing}
                      className={`btn-primary w-full block text-center flex items-center justify-center gap-2 ${
                        (formData.interactionMode === 'voice' && micTestResult !== 'success') ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      {agentConfig.onboarding.startButtonLabel}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </main>
  );
}
