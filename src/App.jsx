import React, { useState, useEffect } from 'react';
import { Mic, Folder, BrainCircuit, MessageSquare, Clock, BookOpen, Zap, Sun, Moon } from 'lucide-react';
import CaptureScreen from './components/CaptureScreen';
import SessionsScreen from './components/SessionsScreen';
import KnowledgeScreen from './components/KnowledgeScreen';
import MentorScreen from './components/MentorScreen';

export default function App() {
  const [activeScreen, setActiveScreen] = useState('capture'); // 'capture' | 'sessions' | 'knowledge' | 'chat'
  const [sessions, setSessions] = useState([]);
  const [knowledgeModel, setKnowledgeModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mentorPrompt, setMentorPrompt] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Fetch initial data on mount
  useEffect(() => {
    fetchAppData();
  }, []);

  const fetchAppData = async () => {
    try {
      const sessionsRes = await fetch('/api/sessions');
      const knowledgeRes = await fetch('/api/knowledge-model');
      if (sessionsRes.ok && knowledgeRes.ok) {
        const sessionsData = await sessionsRes.json();
        const knowledgeData = await knowledgeRes.json();
        setSessions(sessionsData);
        setKnowledgeModel(knowledgeData);
      }
    } catch (e) {
      console.error('Error fetching data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Callback when a new recording/simulation is created
  const handleSessionCreated = (newSession) => {
    fetchAppData();
    setActiveScreen('sessions');
  };

  // Toggle action item from sessions detail
  const handleToggleActionItem = async (sessionId, itemId) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/action-items/${itemId}/toggle`, {
        method: 'POST'
      });
      if (res.ok) {
        const updatedSession = await res.json();
        setSessions(prev => prev.map(s => s.id === sessionId ? updatedSession : s));
      }
    } catch (e) {
      console.error('Error toggling action item:', e);
    }
  };

  // Update session concept map url when generated
  const handleConceptMapGenerated = (sessionId, url) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, conceptMapUrl: url } : s));
    fetchAppData();
  };

  const handleViewSession = (id) => {
    setActiveScreen('sessions');
    setTimeout(() => {
      const sessionsScreenRef = document.getElementById('sessions-trigger');
      if (sessionsScreenRef) {
        const sessionsBtn = document.querySelector(`[data-session-id="${id}"]`);
        if (sessionsBtn) sessionsBtn.click();
      }
    }, 50);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f3] flex flex-col md:flex-row text-text-primary h-screen overflow-hidden">
      
      {/* 1. DESKTOP LEFT SIDEBAR (Hidden on mobile) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-border shrink-0 justify-between p-5 h-full">
        <div className="space-y-6">
          
          {/* Brand Logo */}
          <div className="flex flex-col">
            <span className="text-[16px] font-bold text-[#080808] tracking-tight">AURA</span>
            <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase tracking-wider mt-0.5">
              AI Learning Companion
            </span>
          </div>

          {/* Vertical Navigation Links */}
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => setActiveScreen('capture')}
              className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-full text-[12px] font-mono transition-all text-left active:scale-95 ${activeScreen === 'capture' ? 'bg-[#080808] text-white dark:bg-[#f5f5f3] dark:text-[#080808]' : 'text-[#5a5a55] hover:bg-[#f5f5f3] dark:text-[#a0a09a] dark:hover:bg-[#1c1c1c]'}`}
            >
              <Mic className="w-[14px] h-[14px]" strokeWidth={1.5} />
              <span>Capture Hub</span>
            </button>

            <button
              onClick={() => setActiveScreen('sessions')}
              className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-full text-[12px] font-mono transition-all text-left active:scale-95 ${activeScreen === 'sessions' ? 'bg-[#080808] text-white dark:bg-[#f5f5f3] dark:text-[#080808]' : 'text-[#5a5a55] hover:bg-[#f5f5f3] dark:text-[#a0a09a] dark:hover:bg-[#1c1c1c]'}`}
            >
              <Folder className="w-[14px] h-[14px]" strokeWidth={1.5} />
              <span>Session Library</span>
            </button>

            <button
              onClick={() => setActiveScreen('knowledge')}
              className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-full text-[12px] font-mono transition-all text-left active:scale-95 ${activeScreen === 'knowledge' ? 'bg-[#080808] text-white dark:bg-[#f5f5f3] dark:text-[#080808]' : 'text-[#5a5a55] hover:bg-[#f5f5f3] dark:text-[#a0a09a] dark:hover:bg-[#1c1c1c]'}`}
            >
              <BrainCircuit className="w-[14px] h-[14px]" strokeWidth={1.5} />
              <span>Knowledge Profile</span>
            </button>

            <button
              onClick={() => setActiveScreen('chat')}
              className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-full text-[12px] font-mono transition-all text-left active:scale-95 ${activeScreen === 'chat' ? 'bg-[#080808] text-white dark:bg-[#f5f5f3] dark:text-[#080808]' : 'text-[#5a5a55] hover:bg-[#f5f5f3] dark:text-[#a0a09a] dark:hover:bg-[#1c1c1c]'}`}
            >
              <MessageSquare className="w-[14px] h-[14px]" strokeWidth={1.5} />
              <span>AI Mentor</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Stats & Connection status */}
        <div className="space-y-4 pt-4 border-t border-[#f0f0ee]">
          
          {/* Quick Metrics display */}
          {knowledgeModel && (
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-[#5a5a55]">
              <div className="bg-[#f5f5f3] p-2 rounded-[10px] text-center">
                <span className="text-[#a0a09a] block text-[8px] uppercase">Hours</span>
                <span className="font-semibold text-[13px] text-[#080808]">{knowledgeModel.studyHours}h</span>
              </div>
              <div className="bg-[#f5f5f3] p-2 rounded-[10px] text-center">
                <span className="text-[#a0a09a] block text-[8px] uppercase">Files</span>
                <span className="font-semibold text-[13px] text-[#080808]">{sessions.length}</span>
              </div>
            </div>
          )}

          {/* Theme Toggle row */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase">Theme</span>
            <button
              onClick={() => setIsDarkMode(prev => !prev)}
              className="flex items-center gap-1 bg-[#f5f5f3] px-2 py-0.5 rounded-full text-[9px] font-mono text-[#5a5a55] border border-[#e4e4e0] hover:border-[#080808] active:scale-95 transition-all"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3 h-3 stroke-[#5a5a55]" strokeWidth={1.5} />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3 h-3 stroke-[#5a5a55]" strokeWidth={1.5} />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>

          {/* Connection online label */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase">System Status</span>
            <div className="flex items-center gap-1.5 bg-[#f5f5f3] px-2.5 py-0.5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] live-dot"></div>
              <span className="text-[8px] font-mono font-semibold text-[#22c55e] uppercase">Active</span>
            </div>
          </div>

        </div>
      </aside>

      {/* 2. MOBILE TOP HEADER (Hidden on desktop) */}
      <header className="flex md:hidden h-[52px] border-b border-border px-5 items-center justify-between shrink-0 bg-white z-20">
        <div className="flex items-center gap-1">
          <span className="text-[13px] font-bold text-[#080808] tracking-tight">AURA</span>
          <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase">.companion</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDarkMode(prev => !prev)}
            className="p-1.5 rounded-full border border-[#e4e4e0] bg-[#fafaf9] hover:border-[#080808] transition-all active:scale-90"
          >
            {isDarkMode ? (
              <Sun className="w-3.5 h-3.5 stroke-[#5a5a55]" strokeWidth={1.5} />
            ) : (
              <Moon className="w-3.5 h-3.5 stroke-[#5a5a55]" strokeWidth={1.5} />
            )}
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono font-light text-[#22c55e] uppercase">online</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] live-dot"></div>
          </div>
        </div>
      </header>

      {/* 3. MAIN DYNAMIC SCREEN PANEL */}
      <main className="flex-1 overflow-hidden relative flex flex-col h-full bg-[#f5f5f3]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f3]">
            <span className="text-[11px] font-mono text-[#a0a09a] animate-pulse">Syncing knowledge cache...</span>
          </div>
        ) : (
          <div className="flex-1 h-full overflow-hidden">
            {activeScreen === 'capture' && (
              <CaptureScreen
                onSessionCreated={handleSessionCreated}
                onViewSession={handleViewSession}
                sessions={sessions}
              />
            )}
            {activeScreen === 'sessions' && (
              <SessionsScreen
                sessions={sessions}
                onToggleActionItem={handleToggleActionItem}
                onConceptMapGenerated={handleConceptMapGenerated}
                onFlashcardReviewed={fetchAppData}
              />
            )}
            {activeScreen === 'knowledge' && (
              <KnowledgeScreen
                knowledgeModel={knowledgeModel}
                onAskMentor={(prompt) => {
                  setMentorPrompt(prompt);
                  setActiveScreen('chat');
                }}
              />
            )}
            {activeScreen === 'chat' && (
              <MentorScreen
                knowledgeModel={knowledgeModel}
                initialPrompt={mentorPrompt}
                onClearPrompt={() => setMentorPrompt(null)}
                onFeynmanAssessed={fetchAppData}
              />
            )}
          </div>
        )}
      </main>

      {/* 4. MOBILE BOTTOM TAB NAVIGATION (Hidden on desktop) */}
      <nav className="flex md:hidden h-[52px] border-t border-border bg-white items-center justify-around shrink-0 px-2 pb-[env(safe-area-inset-bottom)] z-20">
        <button
          onClick={() => setActiveScreen('capture')}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 active:scale-90 transition-transform duration-100"
        >
          <Mic className={`w-5 h-5 transition-colors ${activeScreen === 'capture' ? 'stroke-[#080808]' : 'stroke-[#5a5a55]'}`} strokeWidth={1.5} />
          <span className={`text-[9px] mt-0.5 font-mono ${activeScreen === 'capture' ? 'text-[#080808] font-medium' : 'text-[#a0a09a]'}`}>Capture</span>
        </button>

        <button
          id="sessions-trigger"
          onClick={() => setActiveScreen('sessions')}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 active:scale-90 transition-transform duration-100"
        >
          <Folder className={`w-5 h-5 transition-colors ${activeScreen === 'sessions' ? 'stroke-[#080808]' : 'stroke-[#5a5a55]'}`} strokeWidth={1.5} />
          <span className={`text-[9px] mt-0.5 font-mono ${activeScreen === 'sessions' ? 'text-[#080808] font-medium' : 'text-[#a0a09a]'}`}>Library</span>
        </button>

        <button
          onClick={() => setActiveScreen('knowledge')}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 active:scale-90 transition-transform duration-100"
        >
          <BrainCircuit className={`w-5 h-5 transition-colors ${activeScreen === 'knowledge' ? 'stroke-[#080808]' : 'stroke-[#5a5a55]'}`} strokeWidth={1.5} />
          <span className={`text-[9px] mt-0.5 font-mono ${activeScreen === 'knowledge' ? 'text-[#080808] font-medium' : 'text-[#a0a09a]'}`}>Profile</span>
        </button>

        <button
          onClick={() => setActiveScreen('chat')}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 active:scale-90 transition-transform duration-100"
        >
          <MessageSquare className={`w-5 h-5 transition-colors ${activeScreen === 'chat' ? 'stroke-[#080808]' : 'stroke-[#5a5a55]'}`} strokeWidth={1.5} />
          <span className={`text-[9px] mt-0.5 font-mono ${activeScreen === 'chat' ? 'text-[#080808] font-medium' : 'text-[#a0a09a]'}`}>Mentor</span>
        </button>
      </nav>

    </div>
  );
}
