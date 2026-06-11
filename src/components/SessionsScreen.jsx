import React, { useState } from 'react';
import { ArrowLeft, Clock, Calendar, CheckSquare, Square, Mail, Copy, Check, ChevronRight, Award, Image as ImageIcon, Loader, Archive, Download } from 'lucide-react';

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 border border-[#e4e4e0] dark:border-[#222222] rounded-[14px] overflow-hidden bg-[#fafaf9] dark:bg-[#121212] font-mono text-[12px] shadow-subtle text-left">
      <div className="flex justify-between items-center px-4 py-2 bg-[#f5f5f3] dark:bg-[#1c1c1c] border-b border-[#e4e4e0] dark:border-[#222222]">
        <span className="text-[10px] font-semibold text-[#a0a09a] uppercase tracking-wider">{language}</span>
        <button
          onClick={handleCopy}
          className="text-[10px] text-[#5a5a55] dark:text-[#a0a09a] hover:text-[#080808] dark:hover:text-[#f5f5f3] transition-all active:scale-95"
        >
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>
      <div className="p-4 overflow-x-auto relative max-h-[350px]">
        <pre className="m-0 leading-relaxed text-[#080808] dark:text-[#f5f5f3] whitespace-pre select-text font-mono">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

export default function SessionsScreen({ sessions, onToggleActionItem, onConceptMapGenerated, onFlashcardReviewed }) {
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeTab, setActiveTab] = useState('notes'); // For mobile & lecture tab switching
  
  // Interactive UI states
  const [flippedCards, setFlippedCards] = useState({});
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [generatingConceptMap, setGeneratingConceptMap] = useState(false);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Custom Inline Markdown Parser with KaTeX support for block and inline math formulas
  const formatInlineMarkdown = (text) => {
    if (!text) return '';
    
    // Extract math blocks to protect them from normal markdown/HTML transformations
    const mathBlocks = [];
    let processedText = text;

    // 1. Block math: $$ ... $$ (with multi-line support)
    processedText = processedText.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
      const id = `__BLOCK_MATH_${mathBlocks.length}__`;
      let rendered = '';
      if (window.katex) {
        try {
          rendered = `<div class="my-3.5 flex justify-center text-[13px] overflow-x-auto select-all">${window.katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false })}</div>`;
        } catch (e) {
          rendered = `<div class="my-2 text-center font-mono italic text-accent">${formula}</div>`;
        }
      } else {
        rendered = `<div class="my-2 text-center font-mono italic text-accent">${formula}</div>`;
      }
      mathBlocks.push({ id, rendered });
      return id;
    });

    // 2. Inline math: $ ... $ (strict matching to avoid false positive currency spans)
    processedText = processedText.replace(/\$([^\s\$][^\$]*?[^\s\$]|[^\s\$])\$/g, (match, formula) => {
      const id = `__INLINE_MATH_${mathBlocks.length}__`;
      let rendered = '';
      if (window.katex) {
        try {
          rendered = window.katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false });
        } catch (e) {
          rendered = `<code class="font-mono bg-[#f5f5f3] text-black border border-[#e4e4e0] px-1 py-0.2 rounded text-[11.5px]">${formula}</code>`;
        }
      } else {
        rendered = `<code class="font-mono bg-[#f5f5f3] text-black border border-[#e4e4e0] px-1 py-0.2 rounded text-[11.5px]">${formula}</code>`;
      }
      mathBlocks.push({ id, rendered });
      return id;
    });

    // Escape HTML for safety
    let html = processedText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 3. Normal Markdown formatting
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="font-mono bg-[#f5f5f3] text-black border border-[#e4e4e0] px-1 py-0.2 rounded text-[11px]">$1</code>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

    // 4. Restore math blocks
    mathBlocks.forEach(item => {
      const regex = new RegExp(item.id, 'g');
      html = html.replace(regex, item.rendered);
    });

    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  // Custom Markdown Parser to render AI outputs beautifully
  const renderSummaryMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    let inList = false;
    let listItems = [];
    const renderedElements = [];
    
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeLines = [];

    const flushList = (key) => {
      if (listItems.length > 0) {
        renderedElements.push(
          <ul key={`list-${key}`} className="list-disc pl-5 my-2.5 space-y-1.5 text-[13px] text-[#5a5a55] font-sans">
            {listItems.map((li, i) => (
              <li key={i} className="leading-relaxed">{formatInlineMarkdown(li)}</li>
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const isLastLine = index === lines.length - 1;

      // Handle triple backticks code block
      if (trimmed.startsWith('```')) {
        flushList(index);
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = trimmed.substring(3).trim() || 'code';
          codeLines = [];
        } else {
          inCodeBlock = false;
          const codeText = codeLines.join('\n');
          renderedElements.push(
            <CodeBlock key={`code-${index}`} language={codeLanguage} code={codeText} />
          );
        }
        return;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        return;
      }

      if (trimmed.startsWith('###')) {
        flushList(index);
        renderedElements.push(
          <h4 key={index} className="text-[10px] font-mono font-semibold text-[#080808] uppercase tracking-widest mt-5 mb-2 border-b border-[#f0f0ee] pb-1">
            {formatInlineMarkdown(trimmed.replace('###', '').trim())}
          </h4>
        );
      } else if (trimmed.startsWith('##')) {
        flushList(index);
        renderedElements.push(
          <h3 key={index} className="text-[14px] font-bold text-[#080808] mt-6 mb-3">
            {formatInlineMarkdown(trimmed.replace('##', '').trim())}
          </h3>
        );
      } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        inList = true;
        listItems.push(trimmed.substring(1).trim());
      } else if (trimmed.startsWith('|')) {
        flushList(index);
        if (trimmed.includes('---')) return; // skip headers splitters
        const cells = trimmed.split('|').map(c => c.trim()).filter(c => c !== '');
        const isHeader = index === 0 || lines[index - 1]?.includes('---');
        renderedElements.push(
          <div key={index} className={`flex border-b border-[#ebebea] py-2 text-[11px] font-mono ${isHeader ? 'bg-[#f5f5f3] font-medium text-[#080808]' : 'text-[#5a5a55]'}`}>
            {cells.map((cell, cIdx) => (
              <div key={cIdx} className="flex-1 px-2">{formatInlineMarkdown(cell)}</div>
            ))}
          </div>
        );
      } else if (trimmed === '') {
        flushList(index);
      } else {
        flushList(index);
        renderedElements.push(
          <p key={index} className="text-[13px] text-[#5a5a55] leading-relaxed my-2.5 font-sans">
            {formatInlineMarkdown(trimmed)}
          </p>
        );
      }
    });

    if (inCodeBlock && codeLines.length > 0) {
      const codeText = codeLines.join('\n');
      renderedElements.push(
        <CodeBlock key="code-unclosed" language={codeLanguage} code={codeText} />
      );
    }

    flushList('end');
    return renderedElements;
  };

  const handleBack = () => {
    setActiveSessionId(null);
    setFlippedCards({});
    setQuizAnswers({});
    setQuizSubmitted(false);
    setCopiedEmail(false);
  };

  // Flip 3D card
  const toggleCard = (cardId) => {
    setFlippedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  // Record spaced repetition review
  const handleReviewCard = async (cardId, rating) => {
    if (!activeSession) return;
    try {
      const res = await fetch(`/api/sessions/${activeSession.id}/flashcards/${cardId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating })
      });
      if (res.ok) {
        if (onFlashcardReviewed) onFlashcardReviewed();
        // Visual cue: wait a moment and flip the card back to normal
        setTimeout(() => {
          setFlippedCards(prev => ({
            ...prev,
            [cardId]: false
          }));
        }, 1000);
      }
    } catch (e) {
      console.error('Error reviewing flashcard:', e);
    }
  };

  // Choose Quiz Option
  const handleSelectOption = (quizId, optionIndex) => {
    if (quizSubmitted) return;
    setQuizAnswers(prev => ({
      ...prev,
      [quizId]: optionIndex
    }));
  };

  // Copy Follow-up Email draft
  const handleCopyEmail = (email) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  // Generate Concept Map using Qwen-Image
  const handleGenerateConceptMap = async () => {
    if (!activeSession) return;
    setGeneratingConceptMap(true);
    try {
      const res = await fetch(`/api/sessions/${activeSession.id}/generate-concept-map`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to generate image');
      const data = await res.json();
      onConceptMapGenerated(activeSession.id, data.conceptMapUrl);
    } catch (e) {
      console.error(e);
      alert('Error generating concept map.');
    } finally {
      setGeneratingConceptMap(false);
    }
  };

  const handleDownloadMarkdown = (session) => {
    if (!session) return;
    
    let markdown = `# ${session.title}\n\n`;
    markdown += `* **Date:** ${new Date(session.date).toLocaleString()}\n`;
    markdown += `* **Type:** ${session.type}\n`;
    markdown += `* **Duration:** ${session.duration}\n\n`;
    
    if (session.topics?.length > 0) {
      markdown += `## Topics Covered\n${session.topics.map(t => `- ${t}`).join('\n')}\n\n`;
    }
    
    if (session.keyPoints?.length > 0) {
      markdown += `## Key Points\n${session.keyPoints.map(kp => `- ${kp}`).join('\n')}\n\n`;
    }
    
    markdown += `## Summary Notes\n${session.summary}\n\n`;
    
    if (session.type === 'meeting') {
      if (session.decisions?.length > 0) {
        markdown += `## Decisions\n${session.decisions.map(d => `- ${d}`).join('\n')}\n\n`;
      }
      if (session.actionItems?.length > 0) {
        markdown += `## Action Items\n${session.actionItems.map(ai => `- [${ai.done ? 'x' : ' '}] ${ai.task} (Assignee: ${ai.assignee})`).join('\n')}\n\n`;
      }
      if (session.risks?.length > 0) {
        markdown += `## Risks\n${session.risks.map(r => `- ${r}`).join('\n')}\n\n`;
      }
    }
    
    if (session.type === 'lecture' && session.flashcards?.length > 0) {
      markdown += `## Study Flashcards\n`;
      session.flashcards.forEach((card, idx) => {
        markdown += `### Card ${idx + 1}\n**Question:** ${card.question}\n**Answer:** ${card.answer}\n\n`;
      });
    }

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${session.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_summary.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1. WEB RESPONSIVE CATALOG VIEW
  if (!activeSessionId) {
    return (
      <div className="flex flex-col h-full bg-[#f5f5f3] overflow-y-auto">
        
        {/* Title Banner */}
        <div className="px-6 pt-5 pb-3">
          <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase tracking-widest block">Resource Library</span>
          <h2 className="text-[18px] font-semibold text-[#080808]">Session Index</h2>
        </div>

        {/* Responsive Grid Catalog */}
        <div className="flex-1 px-6 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {sessions.map((session) => (
              <button
                key={session.id}
                data-session-id={session.id}
                onClick={() => {
                  setActiveSessionId(session.id);
                  setActiveTab(session.type === 'meeting' ? 'action' : 'notes');
                }}
                className="group flex flex-col justify-between p-5 bg-white border border-[#e8e8e4] rounded-[24px] hover:border-[#a0a09a] hover:shadow-subtle transition-all text-left duration-200 active:scale-[0.98]"
              >
                <div>
                  <div className="flex justify-between items-start gap-3">
                    <span className="text-[14px] font-semibold text-[#080808] leading-snug group-hover:text-black">
                      {session.title}
                    </span>
                    <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                      session.type === 'lecture' ? 'border-amber-200 text-amber-700 bg-amber-50' :
                      session.type === 'meeting' ? 'border-sky-200 text-sky-700 bg-sky-50' :
                      'border-zinc-200 text-zinc-700 bg-zinc-50'
                    }`}>
                      {session.type}
                    </span>
                  </div>

                  {/* Topics list */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {session.topics.slice(0, 3).map((topic, i) => (
                      <span key={i} className="border border-[#e4e4e0] rounded-full px-2.5 py-0.5 text-[9px] font-mono text-[#5a5a55] bg-[#fafaf9]">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer metadata */}
                <div className="flex justify-between items-center mt-6 pt-3 border-t border-[#f0f0ee] text-[10px] font-mono text-[#a0a09a] w-full">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 stroke-[#9a9a94]" />
                    <span>{new Date(session.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 stroke-[#9a9a94]" />
                      <span>{session.duration}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 stroke-[#5a5a55] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>
            ))}

            {sessions.length === 0 && (
              <div className="col-span-full py-16 flex flex-col items-center justify-center bg-white rounded-[24px] border border-dashed border-[#deded8] text-center">
                <Archive className="w-8 h-8 stroke-[#a0a09a] mb-2" strokeWidth={1.2} />
                <span className="text-[12px] font-mono text-[#a0a09a]">Your library is currently empty.</span>
                <span className="text-[10px] font-mono text-[#c8c8c2] mt-0.5">Use the Capture tab to record new material.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. DETAILED LAYOUT DASHBOARDS
  return (
    <div className="flex flex-col h-full bg-[#f5f5f3] overflow-y-auto">
      
      {/* Back breadcrumb panel */}
      <div className="bg-white border-b border-[#ebebea] shrink-0 z-10 sticky top-0">
        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={handleBack} className="p-1.5 -ml-1 rounded-full hover:bg-[#f5f5f3] active:scale-90 transition-all">
              <ArrowLeft className="w-4 h-4 stroke-[#080808]" strokeWidth={1.5} />
            </button>
            <span className="text-[10px] font-mono text-[#b0b0a8] uppercase">Back to Library Index</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#a0a09a]">ID:</span>
            <span className="text-[10px] font-mono font-light text-[#5a5a55] border border-[#e4e4e0] rounded-full px-2 py-0.5 bg-[#fafaf9]">
              {activeSession.id}
            </span>
          </div>
        </div>

        {/* Title Area */}
        <div className="px-6 pb-4">
          <h2 className="text-[18px] font-semibold text-[#080808] leading-tight">{activeSession.title}</h2>
          <div className="flex flex-wrap gap-4 mt-2 text-[10px] font-mono text-[#a0a09a] items-center">
            <span className="uppercase text-[#080808] bg-[#f5f5f3] px-2 py-0.5 rounded-full border border-transparent font-medium">
              {activeSession.type}
            </span>
            <span>{new Date(activeSession.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{activeSession.duration}</span>
            </div>
          </div>
        </div>

        {/* Mobile Tab bar (Hidden on desktop for meeting/thinking) */}
        <div className="flex md:hidden border-t border-[#ebebea] text-[11px] font-mono text-center">
          {activeSession.type !== 'meeting' && (
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-2.5 border-b-2 font-medium ${activeTab === 'notes' ? 'border-[#080808] text-[#080808]' : 'border-transparent text-[#5a5a55]'}`}
            >
              Notes
            </button>
          )}
          {activeSession.type === 'meeting' && (
            <button
              onClick={() => setActiveTab('action')}
              className={`flex-1 py-2.5 border-b-2 font-medium ${activeTab === 'action' ? 'border-[#080808] text-[#080808]' : 'border-transparent text-[#5a5a55]'}`}
            >
              Action Desk
            </button>
          )}
          {activeSession.type === 'lecture' && (
            <>
              <button
                onClick={() => setActiveTab('flashcards')}
                className={`flex-1 py-2.5 border-b-2 font-medium ${activeTab === 'flashcards' ? 'border-[#080808] text-[#080808]' : 'border-transparent text-[#5a5a55]'}`}
              >
                Cards ({activeSession.flashcards?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('quiz')}
                className={`flex-1 py-2.5 border-b-2 font-medium ${activeTab === 'quiz' ? 'border-[#080808] text-[#080808]' : 'border-transparent text-[#5a5a55]'}`}
              >
                Quiz ({activeSession.quizzes?.length || 0})
              </button>
            </>
          )}
        </div>

        {/* Desktop Tab bar for Lectures (Always visible on desktop to handle large sub-modules) */}
        {activeSession.type === 'lecture' && (
          <div className="hidden md:flex border-t border-[#ebebea] text-[11px] font-mono text-center">
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-8 py-3.5 border-b-2 font-medium ${activeTab === 'notes' ? 'border-[#080808] text-[#080808]' : 'border-transparent text-[#5a5a55]'}`}
            >
              Lecture Notes
            </button>
            <button
              onClick={() => setActiveTab('flashcards')}
              className={`px-8 py-3.5 border-b-2 font-medium ${activeTab === 'flashcards' ? 'border-[#080808] text-[#080808]' : 'border-transparent text-[#5a5a55]'}`}
            >
              Flashcard Review ({activeSession.flashcards?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`px-8 py-3.5 border-b-2 font-medium ${activeTab === 'quiz' ? 'border-[#080808] text-[#080808]' : 'border-transparent text-[#5a5a55]'}`}
            >
              Practice Quizzes ({activeSession.quizzes?.length || 0})
            </button>
          </div>
        )}
      </div>

      {/* Main Details Workspace */}
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          
          {/* =======================================================
              SCENARIO 1: MEETING DASHBOARD (Responsive split panels)
              ======================================================= */}
          {activeSession.type === 'meeting' && (
            <div className="space-y-6">
              
              {/* Mobile View tab-toggle */}
              <div className="block md:hidden">
                {activeTab === 'action' ? (
                  <div className="space-y-4">
                    {/* Actions list */}
                    <div className="p-4 bg-white border border-[#e8e8e4] rounded-[20px] space-y-3">
                      <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase tracking-widest block">Action Items</span>
                      <div className="space-y-2">
                        {activeSession.actionItems?.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => onToggleActionItem(activeSession.id, item.id)}
                            className="w-full flex items-start gap-3 text-left p-2 hover:bg-[#f5f5f3] rounded-[10px] transition-all"
                          >
                            <div className="mt-0.5 shrink-0">
                              {item.done ? (
                                <CheckSquare className="w-4 h-4 stroke-[#22c55e]" strokeWidth={1.5} />
                              ) : (
                                <Square className="w-4 h-4 stroke-[#5a5a55]" strokeWidth={1.5} />
                              )}
                            </div>
                            <div className="flex-1">
                              <span className={`text-[12px] block leading-tight font-medium ${item.done ? 'text-[#a0a09a] line-through' : 'text-[#080808]'}`}>
                                {item.task}
                              </span>
                              <span className="text-[9px] font-mono text-[#a0a09a] uppercase mt-0.5 block">Assignee: {item.assignee}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Email template */}
                    {activeSession.followUpEmail && (
                      <div className="p-4 bg-white border border-[#e8e8e4] rounded-[20px] space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-mono font-medium text-[#080808]">Generated Follow-up</span>
                          <button onClick={() => handleCopyEmail(activeSession.followUpEmail)} className="text-[10px] font-mono text-[#5a5a55] border border-[#e4e4e0] px-2 py-0.5 rounded-full hover:border-[#080808] transition-all bg-[#fafaf9]">
                            {copiedEmail ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <div className="p-3 bg-[#f5f5f3] rounded-[12px] font-mono text-[11px] whitespace-pre-wrap max-h-48 overflow-y-auto">{activeSession.followUpEmail}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="p-4 bg-white border border-[#e8e8e4] rounded-[20px]">
                      {renderSummaryMarkdown(activeSession.summary)}
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop View side-by-side dashboard (Hidden on mobile) */}
              <div className="hidden md:grid md:grid-cols-12 md:gap-6 items-start">
                
                {/* Desktop Left Column: Notes & Decisions (takes 7 cols) */}
                <div className="md:col-span-7 space-y-6">
                  
                  {/* Notes summary */}
                  <div className="bg-white border border-[#e8e8e4] rounded-[24px] p-6">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase tracking-widest block">Meeting Synthesis</span>
                      <button
                        onClick={() => handleDownloadMarkdown(activeSession)}
                        className="inline-flex items-center gap-1.5 border border-[#e4e4e0] rounded-full px-2.5 py-1 text-[9px] font-mono font-light text-[#5a5a55] hover:border-[#080808] hover:text-[#080808] bg-[#fafaf9] active:scale-95 transition-all"
                      >
                        <Download className="w-3 h-3" strokeWidth={1.5} />
                        <span>Export Markdown</span>
                      </button>
                    </div>
                    {renderSummaryMarkdown(activeSession.summary)}
                  </div>

                  {/* Decisions Logged */}
                  {activeSession.decisions?.length > 0 && (
                    <div className="bg-white border border-[#e8e8e4] rounded-[24px] p-6 space-y-4">
                      <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase tracking-widest block">Decisions Logged</span>
                      <ul className="space-y-3 text-[13px]">
                        {activeSession.decisions.map((dec, i) => (
                          <li key={i} className="flex gap-3 items-start font-medium text-[#080808]">
                            <span className="text-[10px] font-mono text-[#a0a09a] mt-0.5">#{i+1}</span>
                            <span>{dec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Raw Transcript collapsible */}
                  <div className="p-5 bg-[#ebebea] border border-[#e4e4e0] rounded-[24px] space-y-3">
                    <span className="text-[9px] font-mono text-[#a0a09a] uppercase tracking-widest block">Original Audio Transcript</span>
                    <p className="text-[12px] text-[#5a5a55] leading-relaxed font-mono whitespace-pre-wrap max-h-40 overflow-y-auto pr-1">
                      {activeSession.rawTranscript}
                    </p>
                  </div>

                </div>

                {/* Desktop Right Column: Actions, Risks & Emails (takes 5 cols) */}
                <div className="md:col-span-5 space-y-6">
                  
                  {/* Action checklists */}
                  <div className="bg-white border border-[#e8e8e4] rounded-[24px] p-6 space-y-4">
                    <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase tracking-widest block">Action Items Checklist</span>
                    <div className="space-y-3">
                      {activeSession.actionItems?.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => onToggleActionItem(activeSession.id, item.id)}
                          className="w-full flex items-start gap-3 text-left p-3.5 hover:bg-[#f5f5f3] rounded-[14px] border border-[#e8e8e4]/50 transition-all hover:border-[#a0a09a]"
                        >
                          <div className="mt-0.5 shrink-0">
                            {item.done ? (
                              <CheckSquare className="w-[15px] h-[15px] stroke-[#22c55e]" strokeWidth={1.5} />
                            ) : (
                              <Square className="w-[15px] h-[15px] stroke-[#5a5a55]" strokeWidth={1.5} />
                            )}
                          </div>
                          <div className="flex-1">
                            <span className={`text-[12px] block leading-tight font-medium ${item.done ? 'text-[#a0a09a] line-through font-normal' : 'text-[#080808]'}`}>
                              {item.task}
                            </span>
                            <span className="text-[9px] font-mono text-[#a0a09a] uppercase mt-1 block">Assignee: {item.assignee}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Risks Alerts */}
                  {activeSession.risks?.length > 0 && (
                    <div className="bg-white border border-red-100 rounded-[24px] p-6 space-y-3">
                      <span className="text-[9px] font-mono font-semibold text-[#ef4444] uppercase tracking-widest block">Critical Risks</span>
                      <ul className="space-y-2 text-[11px] text-[#ef4444] font-mono">
                        {activeSession.risks.map((risk, i) => (
                          <li key={i} className="flex gap-2 items-start leading-tight">
                            <span>•</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Follow-up Email compiler */}
                  {activeSession.followUpEmail && (
                    <div className="bg-white border border-[#e8e8e4] rounded-[24px] p-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 stroke-[#080808]" strokeWidth={1.5} />
                          <span className="text-[11px] font-mono font-medium text-[#080808]">Email Template</span>
                        </div>
                        <button
                          onClick={() => handleCopyEmail(activeSession.followUpEmail)}
                          className="flex items-center gap-1 text-[10px] font-mono text-[#5a5a55] border border-[#e4e4e0] px-2.5 py-0.5 rounded-full hover:border-[#080808] transition-all bg-[#fafaf9] active:scale-95"
                        >
                          {copiedEmail ? (
                            <>
                              <Check className="w-3 h-3 stroke-[#22c55e]" strokeWidth={1.5} />
                              <span className="text-[#22c55e]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="p-4 bg-[#f5f5f3] rounded-[16px] font-mono text-[11px] text-[#5a5a55] whitespace-pre-wrap max-h-60 overflow-y-auto">
                        {activeSession.followUpEmail}
                      </div>
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

          {/* =======================================================
              SCENARIO 2: LECTURE DASHBOARD (Tabbed grids)
              ======================================================= */}
          {activeSession.type === 'lecture' && (
            <div className="space-y-6">
              
              {/* Tab 2.1: NOTES (Split Summary on Left, Qwen concept Map on Right) */}
              {activeTab === 'notes' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Summary */}
                  <div className="lg:col-span-7 bg-white border border-[#e8e8e4] rounded-[24px] p-6 space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase tracking-widest block">Lecture Notes Synthesis</span>
                      <button
                        onClick={() => handleDownloadMarkdown(activeSession)}
                        className="inline-flex items-center gap-1.5 border border-[#e4e4e0] rounded-full px-2.5 py-1 text-[9px] font-mono font-light text-[#5a5a55] hover:border-[#080808] hover:text-[#080808] bg-[#fafaf9] active:scale-95 transition-all"
                      >
                        <Download className="w-3 h-3" strokeWidth={1.5} />
                        <span>Export Markdown</span>
                      </button>
                    </div>
                    <div>
                      {renderSummaryMarkdown(activeSession.summary)}
                    </div>

                    {/* Mentor text prompt explanation */}
                    {activeSession.personalExplanation && (
                      <div className="p-5 bg-[#fafaf9] border border-[#080808] rounded-[20px] space-y-2">
                        <span className="text-[9px] font-mono font-semibold text-[#080808] uppercase tracking-widest block">AI Mentor Insight</span>
                        <p className="text-[12px] text-[#080808] font-mono leading-relaxed">{activeSession.personalExplanation}</p>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Qwen concept map and transcript */}
                  <div className="lg:col-span-5 space-y-6">
                    
                    {/* Qwen Map Card */}
                    <div className="bg-white border border-[#e8e8e4] rounded-[24px] p-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 stroke-[#080808]" strokeWidth={1.5} />
                          <span className="text-[11px] font-mono font-medium text-[#080808]">Qwen-Image NIM Graphic</span>
                        </div>
                        <span className="text-[9px] font-mono text-[#a0a09a]">Visual Map</span>
                      </div>

                      {activeSession.conceptMapUrl ? (
                        <div className="border border-[#ebebea] rounded-[16px] overflow-hidden bg-white aspect-[4/3] flex items-center justify-center">
                          <img
                            src={activeSession.conceptMapUrl}
                            alt="Concept Map Diagram"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={handleGenerateConceptMap}
                          disabled={generatingConceptMap}
                          className="w-full aspect-[4/3] border border-dashed border-[#deded8] rounded-[16px] hover:border-[#a0a09a] transition-all flex flex-col justify-center items-center gap-1.5 text-[#5a5a55] bg-[#fafaf9]"
                        >
                          {generatingConceptMap ? (
                            <>
                              <Loader className="w-5 h-5 animate-spin stroke-[#080808]" strokeWidth={1.5} />
                              <span className="text-[11px] font-mono text-[#080808]">Drawing Concept Layout...</span>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-6 h-6 stroke-[#5a5a55] mb-1" strokeWidth={1.5} />
                              <span className="text-[11px] font-medium text-[#080808]">Generate Visual concept map</span>
                              <span className="text-[9px] font-mono text-[#b0b0a8]">B&W Line-art graphic</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Raw transcript */}
                    <div className="p-5 bg-[#ebebea] border border-[#e4e4e0] rounded-[24px] space-y-3">
                      <span className="text-[9px] font-mono text-[#a0a09a] uppercase tracking-widest block">Original Audio Transcript</span>
                      <p className="text-[11px] text-[#5a5a55] leading-relaxed font-mono whitespace-pre-wrap max-h-44 overflow-y-auto pr-1">
                        {activeSession.rawTranscript}
                      </p>
                    </div>

                  </div>

                </div>
              )}

              {/* Tab 2.2: FLASHCARDS (Responsive grids of cards + SM-2 forgetting curve) */}
              {activeTab === 'flashcards' && (
                <div className="space-y-6">
                  
                  {/* Spaced Repetition estimated stats and forgetting curve */}
                  {(() => {
                    const reviewedCards = activeSession.flashcards?.filter(c => c.repetitions > 0) || [];
                    const avgInterval = reviewedCards.length > 0
                      ? (reviewedCards.reduce((acc, c) => acc + c.interval, 0) / reviewedCards.length)
                      : 0;
                    const avgEF = reviewedCards.length > 0
                      ? (reviewedCards.reduce((acc, c) => acc + c.easeFactor, 0) / reviewedCards.length)
                      : 2.5;

                    const strength = avgInterval > 0 ? parseFloat((avgInterval * 1.5).toFixed(1)) : 1.0;
                    
                    // Estimated current retention based on days. We assume 0.4 days since last study session for visualization.
                    const tVal = reviewedCards.length > 0 ? 0.4 : 0;
                    const retention = Math.round(100 * Math.exp(-tVal / strength));

                    // Generate SVG forgetting curve path
                    let pathD = 'M 10 20';
                    const daysToPlot = 14;
                    for (let t = 1; t <= daysToPlot; t++) {
                      const R = 100 * Math.exp(-t / strength);
                      const px = 10 + (t / daysToPlot) * 360;
                      const py = 110 - R * 0.9;
                      pathD += ` L ${px} ${py}`;
                    }

                    return (
                      <div className="p-5 bg-white border border-[#e8e8e4] rounded-[24px] grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        
                        {/* Metrics panel */}
                        <div className="md:col-span-5 space-y-4">
                          <div>
                            <span className="text-[9px] font-mono font-semibold text-[#a0a09a] uppercase tracking-widest block">Active Recall Diagnostic</span>
                            <h3 className="text-[15px] font-semibold text-[#080808]">SuperMemo SM-2 Memory Model</h3>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-center">
                            <div className="bg-[#f5f5f3] p-3 rounded-[16px] border border-transparent">
                              <span className="text-[8px] font-mono text-[#a0a09a] block uppercase">Est. Retention</span>
                              <span className={`text-[16px] font-mono font-bold ${retention >= 80 ? 'text-[#22c55e]' : 'text-amber-500'}`}>
                                {retention}%
                              </span>
                            </div>
                            <div className="bg-[#f5f5f3] p-3 rounded-[16px] border border-transparent">
                              <span className="text-[8px] font-mono text-[#a0a09a] block uppercase">Memory Half-Life</span>
                              <span className="text-[16px] font-mono font-bold text-[#080808]">
                                {strength} day{strength !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-[10px] text-[#5a5a55] font-mono leading-normal">
                            Practice with the study cards below. Grading ease adjusts the neural interval weights, stretching memory duration.
                          </div>
                        </div>

                        {/* Forgetting curve SVG chart */}
                        <div className="md:col-span-7 flex flex-col justify-center items-center relative bg-[#fafaf9] rounded-[20px] p-3 border border-[#ebebea] min-h-[140px]">
                          <span className="text-[8px] font-mono text-[#a0a09a] uppercase absolute top-2 right-3">Memory Decay curve</span>
                          
                          <svg className="w-full h-full overflow-visible max-h-[110px]" viewBox="0 0 400 120">
                            {/* Threshold line */}
                            <line x1="10" y1="42.5" x2="390" y2="42.5" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
                            <text x="390" y="38" textAnchor="end" fontSize="7" fill="#ef4444" fontFamily="mono" opacity="0.8">75% Recall Threshold</text>
                            
                            {/* Gridlines */}
                            <line x1="10" y1="110" x2="390" y2="110" stroke="#ebebea" strokeWidth="1" />
                            <line x1="10" y1="20" x2="10" y2="110" stroke="#ebebea" strokeWidth="1" />

                            {/* Path */}
                            <path d={pathD} fill="none" stroke="#080808" strokeWidth="2.5" />
                            
                            {/* Current Point */}
                            {reviewedCards.length > 0 && (
                              <>
                                <circle cx={10 + (tVal / daysToPlot) * 360} cy={110 - retention * 0.9} r="4" fill="#22c55e" stroke="white" strokeWidth="1.5" />
                                <text x={10 + (tVal / daysToPlot) * 360 + 8} y={110 - retention * 0.9 + 3} fontSize="7" fill="#22c55e" fontFamily="mono" fontWeight="bold">Now</text>
                              </>
                            )}

                            {/* Label */}
                            <text x="10" y="118" fontSize="7" fill="#a0a09a" fontFamily="mono">Start</text>
                            <text x="200" y="118" textAnchor="middle" fontSize="7" fill="#a0a09a" fontFamily="mono">7 Days</text>
                            <text x="390" y="118" textAnchor="end" fontSize="7" fill="#a0a09a" fontFamily="mono">14 Days</text>
                          </svg>
                        </div>

                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeSession.flashcards?.map((card) => (
                      <div
                        key={card.id}
                        onClick={() => toggleCard(card.id)}
                        className="perspective-1000 w-full h-44 cursor-pointer"
                      >
                        <div className={`relative w-full h-full duration-500 transform-style-3d ${flippedCards[card.id] ? 'rotate-y-180' : ''}`}>
                          
                          {/* Front of Card */}
                          <div className="absolute w-full h-full backface-hidden bg-white border border-[#e8e8e4] rounded-[24px] p-5 flex flex-col justify-between hover:border-[#a0a09a] transition-all">
                            <div className="flex justify-between items-center w-full">
                              <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase tracking-widest">Question</span>
                              {card.interval > 0 && (
                                <span className="text-[8.5px] font-mono font-medium bg-[#22c55e]/10 border border-[#22c55e]/25 px-2 py-0.2 rounded-full text-[#22c55e]">
                                  Interval: {card.interval}d
                                </span>
                              )}
                            </div>
                            <p className="text-[12.5px] font-semibold text-[#080808] text-center my-auto leading-snug">
                              {card.question}
                            </p>
                            <span className="text-[9px] font-mono text-[#a0a09a] text-center uppercase tracking-wider">Tap card to reveal answer</span>
                          </div>

                          {/* Back of Card */}
                          <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-[#080808] dark:bg-[#1c1c1c] text-white rounded-[24px] p-5 flex flex-col justify-between border border-transparent dark:border-[#222222]">
                            <span className="text-[9px] font-mono font-light text-white/50 uppercase tracking-widest">Answer Explanation</span>
                            <p className="text-[11.5px] text-white/95 text-center my-auto leading-relaxed overflow-y-auto max-h-[80px]">
                              {card.answer}
                            </p>
                            
                            {/* Spaced repetition SM-2 grading buttons */}
                            <div 
                              className="flex justify-between gap-1 w-full pt-1.5 border-t border-white/10"
                              onClick={(e) => e.stopPropagation()} // Prevent card from flipping back when clicking button
                            >
                              <button 
                                onClick={() => handleReviewCard(card.id, 1)}
                                className="flex-1 py-1 rounded bg-[#ef4444]/10 hover:bg-[#ef4444]/20 border border-[#ef4444]/15 hover:border-[#ef4444]/35 text-[#ef4444] text-[8px] font-mono font-semibold transition-all active:scale-90"
                              >
                                Again
                              </button>
                              <button 
                                onClick={() => handleReviewCard(card.id, 2)}
                                className="flex-1 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/15 hover:border-amber-500/35 text-amber-500 text-[8px] font-mono font-semibold transition-all active:scale-90"
                              >
                                Hard
                              </button>
                              <button 
                                onClick={() => handleReviewCard(card.id, 3)}
                                className="flex-1 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/15 hover:border-blue-500/35 text-blue-500 text-[8px] font-mono font-semibold transition-all active:scale-90"
                              >
                                Good
                              </button>
                              <button 
                                onClick={() => handleReviewCard(card.id, 4)}
                                className="flex-1 py-1 rounded bg-[#22c55e]/10 hover:bg-[#22c55e]/20 border border-[#22c55e]/15 hover:border-[#22c55e]/35 text-[#22c55e] text-[8px] font-mono font-semibold transition-all active:scale-90"
                              >
                                Easy
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    ))}

                    {(!activeSession.flashcards || activeSession.flashcards.length === 0) && (
                      <div className="col-span-full text-center py-12 bg-white border border-[#ebebea] rounded-[24px]">
                        <span className="text-[11px] font-mono text-[#a0a09a]">No study cards generated for this session.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2.3: QUIZ (Responsive split columns) */}
              {activeTab === 'quiz' && (
                <div className="space-y-6">
                  <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase tracking-widest block">Concept Assessment</span>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    
                    {/* Left side: Quiz questions */}
                    <div className="space-y-4">
                      {activeSession.quizzes?.map((quiz, qIdx) => {
                        const selectedIdx = quizAnswers[quiz.id];
                        const isCorrect = selectedIdx === quiz.answerIndex;
                        return (
                          <div key={quiz.id} className="p-5 bg-white border border-[#e8e8e4] rounded-[24px] space-y-4">
                            <div className="flex gap-2">
                              <span className="text-[12px] font-mono text-[#a0a09a]">{qIdx+1}.</span>
                              <h4 className="text-[13px] font-semibold text-[#080808] leading-snug">
                                {quiz.question}
                              </h4>
                            </div>

                            <div className="space-y-2">
                              {quiz.options.map((opt, oIdx) => {
                                const isSelected = selectedIdx === oIdx;
                                const showCorrectMarker = quizSubmitted && oIdx === quiz.answerIndex;
                                const showIncorrectMarker = quizSubmitted && isSelected && !isCorrect;

                                return (
                                  <button
                                    key={oIdx}
                                    disabled={quizSubmitted}
                                    onClick={() => handleSelectOption(quiz.id, oIdx)}
                                    className={`w-full p-3 rounded-[14px] border text-left text-[12px] transition-all flex items-center justify-between ${
                                      showCorrectMarker ? 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]' :
                                      showIncorrectMarker ? 'border-[#ef4444] bg-[#ef4444]/10 text-[#ef4444]' :
                                      isSelected ? 'border-[#080808] bg-[#f5f5f3] font-medium text-[#080808]' :
                                      'border-[#ebebea] hover:border-[#a0a09a] text-[#5a5a55]'
                                    }`}
                                  >
                                    <span>{opt}</span>
                                    {quizSubmitted && oIdx === quiz.answerIndex && (
                                      <Award className="w-4 h-4 stroke-[#22c55e]" strokeWidth={1.5} />
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {quizSubmitted && quiz.explanation && (
                              <div className={`mt-3 p-3.5 rounded-[14px] text-[11.5px] leading-relaxed font-mono border ${
                                isCorrect 
                                  ? 'bg-[#22c55e]/5 border-[#22c55e]/15 text-[#22c55e]' 
                                  : 'bg-[#ef4444]/5 border-[#ef4444]/15 text-[#ef4444]'
                              }`}>
                                <span className="font-semibold block mb-1">
                                  {isCorrect ? '✓ Explanation' : '✗ Explanation'}
                                </span>
                                <p className="opacity-90">{quiz.explanation}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Right side: Grading results details */}
                    <div className="space-y-4">
                      {!quizSubmitted && activeSession.quizzes?.length > 0 && (
                        <button
                          onClick={() => setQuizSubmitted(true)}
                          disabled={Object.keys(quizAnswers).length < activeSession.quizzes.length}
                          className="w-full bg-[#080808] text-white dark:bg-[#f5f5f3] dark:text-[#080808] rounded-full py-3 text-[12px] font-mono font-medium disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          Grade Answers
                          <ChevronRight className="w-4 h-4 stroke-white dark:stroke-[#080808]" strokeWidth={1.5} />
                        </button>
                      )}

                      {quizSubmitted && (
                        <div className="p-6 bg-white border border-[#e8e8e4] rounded-[24px] space-y-3 text-center">
                          <span className="text-[16px] font-semibold text-[#080808] block">
                            Quiz Completed
                          </span>
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30 my-2">
                            <span className="text-[20px] font-mono font-bold text-[#22c55e]">
                              {activeSession.quizzes.filter(q => quizAnswers[q.id] === q.answerIndex).length}/{activeSession.quizzes.length}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#5a5a55] font-mono max-w-[280px] mx-auto leading-relaxed">
                            Your scores have been parsed into your personalized memory system.
                          </p>
                          <button
                            onClick={() => { setQuizSubmitted(false); setQuizAnswers({}); }}
                            className="mt-4 text-[11px] font-mono text-[#080808] border-b border-[#080808] hover:border-transparent transition-all"
                          >
                            Restart Practice Quiz
                          </button>
                        </div>
                      )}

                      {(!activeSession.quizzes || activeSession.quizzes.length === 0) && (
                        <div className="text-center py-12 bg-white border border-[#ebebea] rounded-[24px]">
                          <span className="text-[11px] font-mono text-[#a0a09a]">No quiz generated for this session.</span>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}

          {/* =======================================================
              SCENARIO 3: THINKING DASHBOARD (Responsive split panels)
              ======================================================= */}
          {activeSession.type === 'thinking' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Summary & Insights (takes 7 cols) */}
              <div className="lg:col-span-7 bg-white border border-[#e8e8e4] rounded-[24px] p-6 space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase tracking-widest block">Ideation Summary</span>
                  <button
                    onClick={() => handleDownloadMarkdown(activeSession)}
                    className="inline-flex items-center gap-1.5 border border-[#e4e4e0] rounded-full px-2.5 py-1 text-[9px] font-mono font-light text-[#5a5a55] hover:border-[#080808] hover:text-[#080808] bg-[#fafaf9] active:scale-95 transition-all"
                  >
                    <Download className="w-3 h-3" strokeWidth={1.5} />
                    <span>Export Markdown</span>
                  </button>
                </div>
                {renderSummaryMarkdown(activeSession.summary)}

                {/* Key insights list */}
                {activeSession.insights?.length > 0 && (
                  <div className="border-t border-[#f0f0ee] pt-5 space-y-3">
                    <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase tracking-widest block">Extracted Insights</span>
                    <ul className="space-y-2.5 text-[13px] text-[#080808]">
                      {activeSession.insights.map((ins, i) => (
                        <li key={i} className="flex gap-2 items-start font-medium">
                          <span className="text-[10px] font-mono text-[#a0a09a] mt-0.5">•</span>
                          <span>{ins}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right Column: AI Coach analysis & transcript (takes 5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* AI Mentor block */}
                {activeSession.personalExplanation && (
                  <div className="bg-[#080808] text-white rounded-[24px] p-6 space-y-3">
                    <span className="text-[9px] font-mono font-semibold text-white/50 uppercase tracking-widest block">AI Mentor Feedback</span>
                    <p className="text-[12px] text-white/90 font-mono leading-relaxed">{activeSession.personalExplanation}</p>
                  </div>
                )}

                {/* Collapsible raw transcript */}
                <div className="p-5 bg-[#ebebea] border border-[#e4e4e0] rounded-[24px] space-y-3">
                  <span className="text-[9px] font-mono text-[#a0a09a] uppercase tracking-widest block">Audio Transcript</span>
                  <p className="text-[11px] text-[#5a5a55] leading-relaxed font-mono whitespace-pre-wrap max-h-44 overflow-y-auto pr-1">
                    {activeSession.rawTranscript}
                  </p>
                </div>

              </div>

            </div>
          )}

        </div>
      </div>

    </div>
  );
}
