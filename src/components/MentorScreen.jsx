import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, MessageCircle, AlertCircle } from 'lucide-react';

function RAGSources({ sources }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="mb-2 pb-2 border-b border-[#e8e8e4] dark:border-[#222222] w-full text-[11px] font-mono">
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="flex items-center gap-1.5 text-[#5a5a55] dark:text-[#a0a09a] hover:text-[#080808] dark:hover:text-[#f5f5f3] transition-all active:scale-95"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse stroke-current" strokeWidth={1.5} />
        <span className="font-semibold">RAG Neural Semantic Memory Search: {sources.length} document match{sources.length > 1 ? 'es' : ''}</span>
        <span className="text-[9px] text-[#a0a09a]">({isOpen ? 'Hide detail' : 'Expand details'})</span>
      </button>
      
      {isOpen && (
        <div className="mt-2 p-3 bg-[#f5f5f3] dark:bg-[#121212] border border-[#ebebea] dark:border-[#222222] rounded-[12px] space-y-2 text-left">
          {sources.map((src, i) => (
            <div key={i} className="space-y-0.5 border-b border-[#ebebea] dark:border-[#222222] pb-1.5 last:border-b-0 last:pb-0">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-medium text-[#080808] dark:text-[#f5f5f3] truncate max-w-[200px]">{src.title}</span>
                <span className="bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/25 px-1.5 py-0.2 rounded-full text-[8px] font-semibold">
                  {Math.round(src.similarity * 100)}% Cosine Similarity
                </span>
              </div>
              <p className="text-[9.5px] text-[#5a5a55] dark:text-[#a0a09a] leading-relaxed italic line-clamp-2">
                {src.snippet}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CodeBlock({ language, code, isStreaming = false }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 border border-[#e4e4e0] dark:border-[#222222] rounded-[14px] overflow-hidden bg-[#fafaf9] dark:bg-[#121212] font-mono text-[12px] shadow-subtle text-left animate-fade-in">
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
        {isStreaming && (
          <span className="inline-block w-1.5 h-3.5 bg-[#080808] dark:bg-[#f5f5f3] ml-0.5 animate-pulse align-middle" style={{ animationDuration: '0.8s' }} />
        )}
      </div>
    </div>
  );
}

export default function MentorScreen({ knowledgeModel, initialPrompt, onClearPrompt, onFeynmanAssessed }) {
  const [chatHistory, setChatHistory] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Feynman Active Teaching Arena states
  const [chatMode, setChatMode] = useState('chat'); // 'chat' | 'feynman'
  const [feynmanTopic, setFeynmanTopic] = useState('');
  const [feynmanChat, setFeynmanChat] = useState([]);
  const [feynmanLoading, setFeynmanLoading] = useState(false);
  const [feynmanAssessment, setFeynmanAssessment] = useState(null);
  const [feynmanAssessing, setFeynmanAssessing] = useState(false);
  const [selectedDropdownTopic, setSelectedDropdownTopic] = useState('');

  const messagesEndRef = useRef(null);

  // Fetch chat history on load
  useEffect(() => {
    const fetchChat = async () => {
      try {
        const res = await fetch('/api/chat');
        if (res.ok) {
          const data = await res.json();
          setChatHistory(data);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      } finally {
        setHistoryLoaded(true);
      }
    };
    fetchChat();
  }, []);

  // Handle initial prompt from concept graph clicks
  useEffect(() => {
    if (initialPrompt && historyLoaded && !isLoading) {
      setChatMode('chat');
      handleSubmit(initialPrompt);
      if (onClearPrompt) onClearPrompt();
    }
  }, [initialPrompt, historyLoaded]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, feynmanChat, isLoading, feynmanLoading]);

  // Gather unique topics
  const availableTopics = [];
  if (knowledgeModel) {
    if (knowledgeModel.topicsMastered) {
      knowledgeModel.topicsMastered.forEach(t => {
        if (!availableTopics.includes(t.name)) availableTopics.push(t.name);
      });
    }
    if (knowledgeModel.topicsStruggling) {
      knowledgeModel.topicsStruggling.forEach(t => {
        if (!availableTopics.includes(t.name)) availableTopics.push(t.name);
      });
    }
  }
  const topicsList = availableTopics.length > 0 ? availableTopics : ["Neural Networks", "Newton's Second Law", "SaaS Pricing Models"];

  // Initialize selectedDropdownTopic when topicsList changes
  useEffect(() => {
    if (topicsList.length > 0 && !selectedDropdownTopic) {
      setSelectedDropdownTopic(topicsList[0]);
    }
  }, [topicsList]);

  const handleStartFeynman = (topic) => {
    setFeynmanTopic(topic);
    setFeynmanAssessment(null);
    setFeynmanChat([
      {
        id: `fey-${Date.now()}`,
        sender: 'mentor',
        text: `Hi! I want to learn about **${topic}**, but I don't know much about computers or science. Can you explain it to me in very simple words? What is it?`,
        timestamp: new Date().toISOString()
      }
    ]);
  };

  const handleSendFeynman = async (textToSend) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    if (!textToSend) setInputText('');
    setFeynmanLoading(true);
    setError(null);

    // Add user's message
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toISOString()
    };
    const updatedChat = [...feynmanChat, userMsg];
    setFeynmanChat(updatedChat);

    const tempId = `toby-temp-${Date.now()}`;
    setFeynmanChat(prev => [...prev, {
      id: tempId,
      sender: 'mentor',
      text: '',
      timestamp: new Date().toISOString(),
      isStreaming: true
    }]);

    try {
      const res = await fetch('/api/feynman/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: feynmanTopic, messages: updatedChat })
      });

      if (!res.ok) throw new Error('Student disconnected');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let replyText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.substring(6));
              if (data.chunk) {
                replyText += data.chunk;
                setFeynmanChat(prev => prev.map(msg => msg.id === tempId ? { ...msg, text: replyText } : msg));
              }
            } catch (e) {
              console.warn(e);
            }
          }
        }
      }

      setFeynmanChat(prev => prev.map(msg => msg.id === tempId ? {
        id: `toby-chat-${Date.now()}`,
        sender: 'mentor',
        text: replyText,
        timestamp: new Date().toISOString()
      } : msg));

    } catch (err) {
      console.error(err);
      setError('Toby is taking a break. Please try explaining again.');
      setFeynmanChat(prev => prev.filter(msg => msg.id !== tempId));
    } finally {
      setFeynmanLoading(false);
    }
  };

  const handleAssessFeynman = async () => {
    setFeynmanAssessing(true);
    setError(null);
    try {
      const res = await fetch('/api/feynman/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: feynmanTopic, messages: feynmanChat })
      });
      if (!res.ok) throw new Error('Assessment failed');
      const assessmentData = await res.json();
      setFeynmanAssessment(assessmentData);
      if (onFeynmanAssessed) onFeynmanAssessed();
    } catch (err) {
      console.error(err);
      setError('Could not generate assessment. Please try again.');
    } finally {
      setFeynmanAssessing(false);
    }
  };

  const handleSubmit = async (textToSend) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    if (!textToSend) setInputText('');
    setIsLoading(true);
    setError(null);

    // Optimistic user update
    const tempUserMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toISOString()
    };
    setChatHistory(prev => [...prev, tempUserMsg]);

    const tempId = `mentor-temp-${Date.now()}`;
    // Add temporary loading message in history
    setChatHistory(prev => [...prev, {
      id: tempId,
      sender: 'mentor',
      text: '',
      timestamp: new Date().toISOString(),
      isStreaming: true
    }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query })
      });

      if (!res.ok) {
        throw new Error('API communication failure');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let replyText = '';
      let suggestions = [];
      let retrievedSources = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep last partial line

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.substring(6));
              if (data.error) {
                throw new Error(data.error);
              }
              if (data.chunk) {
                replyText += data.chunk;
                setChatHistory(prev => prev.map(msg => msg.id === tempId ? { ...msg, text: replyText } : msg));
              } else if (data.done) {
                suggestions = data.suggestions;
                retrievedSources = data.retrievedSources;
                replyText = data.reply;
              }
            } catch (e) {
              console.warn('Error parsing stream line:', e);
            }
          }
        }
      }

      // Finalize the message
      setChatHistory(prev => prev.map(msg => msg.id === tempId ? {
        id: `chat-${Date.now()}`,
        sender: 'mentor',
        text: replyText,
        timestamp: new Date().toISOString(),
        suggestions,
        retrievedSources
      } : msg));

    } catch (err) {
      console.error(err);
      setError('Companion service temporarily busy. Please try sending again.');
      // Remove the temp message if we errored out
      setChatHistory(prev => prev.filter(msg => msg.id !== tempId));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    handleSubmit(suggestion);
  };

  // Custom Inline & Block Markdown Parser for the AI Mentor Conversation Feed
  const formatInlineMarkdown = (text, isUser = false, showCursor = false) => {
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
          rendered = `<div class="my-2 text-center font-mono italic ${isUser ? 'text-white/80' : 'text-accent'}">${formula}</div>`;
        }
      } else {
        rendered = `<div class="my-2 text-center font-mono italic ${isUser ? 'text-white/80' : 'text-accent'}">${formula}</div>`;
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
    const codeClass = isUser 
      ? 'font-mono bg-white/20 text-white px-1 py-0.2 rounded text-[11px]' 
      : 'font-mono bg-[#f5f5f3] text-black border border-[#e4e4e0] px-1 py-0.2 rounded text-[11px]';
    html = html.replace(/`([^`]+)`/g, `<code class="${codeClass}">$1</code>`);

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

    return (
      <span className="relative">
        <span dangerouslySetInnerHTML={{ __html: html }} />
        {showCursor && (
          <span className="inline-block w-1.5 h-3.5 bg-[#080808] dark:bg-[#f5f5f3] ml-0.5 animate-pulse align-middle" style={{ animationDuration: '0.8s' }} />
        )}
      </span>
    );
  };

  const renderChatMarkdown = (text, isUser = false, isStreaming = false) => {
    if (!text) return null;
    const lines = text.split('\n');
    let inList = false;
    let listItems = [];
    const renderedElements = [];

    let inCodeBlock = false;
    let codeLanguage = '';
    let codeLines = [];

    const flushList = (key, isEnd = false) => {
      if (listItems.length > 0) {
        renderedElements.push(
          <ul key={`list-${key}`} className={`list-disc pl-5 my-2 space-y-1 text-[13px] font-sans ${isUser ? 'text-white/95' : 'text-[#5a5a55]'}`}>
            {listItems.map((li, i) => {
              const isLastItem = isEnd && i === listItems.length - 1;
              return (
                <li key={i} className="leading-relaxed">
                  {formatInlineMarkdown(li, isUser, isLastItem && isStreaming)}
                </li>
              );
            })}
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
          <h4 key={index} className={`text-[10px] font-mono font-semibold uppercase tracking-widest mt-4 mb-1 border-b pb-0.5 ${isUser ? 'text-white border-white/20' : 'text-[#080808] border-[#f0f0ee]'}`}>
            {formatInlineMarkdown(trimmed.replace('###', '').trim(), isUser, isLastLine && isStreaming)}
          </h4>
        );
      } else if (trimmed.startsWith('##')) {
        flushList(index);
        renderedElements.push(
          <h3 key={index} className={`text-[13px] font-bold mt-4 mb-2 ${isUser ? 'text-white' : 'text-[#080808]'}`}>
            {formatInlineMarkdown(trimmed.replace('##', '').trim(), isUser, isLastLine && isStreaming)}
          </h3>
        );
      } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        inList = true;
        listItems.push(trimmed.substring(1).trim());
      } else if (trimmed.startsWith('|')) {
        flushList(index);
        if (trimmed.includes('---')) return;
        const cells = trimmed.split('|').map(c => c.trim()).filter(c => c !== '');
        const isHeader = index === 0 || lines[index - 1]?.includes('---');
        renderedElements.push(
          <div key={index} className={`flex border-b py-2 text-[11px] font-mono ${isHeader ? (isUser ? 'bg-white/10 font-medium text-white border-white/20' : 'bg-[#f5f5f3] font-medium text-[#080808] border-[#ebebea]') : (isUser ? 'text-white/80 border-white/10' : 'text-[#5a5a55] border-[#ebebea]')}`}>
            {cells.map((cell, cIdx) => {
              const isLastCell = isLastLine && cIdx === cells.length - 1;
              return (
                <div key={cIdx} className="flex-1 px-2">
                  {formatInlineMarkdown(cell, isUser, isLastCell && isStreaming)}
                </div>
              );
            })}
          </div>
        );
      } else if (trimmed === '') {
        flushList(index, isLastLine);
      } else {
        flushList(index);
        renderedElements.push(
          <p key={index} className={`text-[13px] leading-relaxed my-2 font-sans ${isUser ? 'text-white' : 'text-[#5a5a55]'}`}>
            {formatInlineMarkdown(trimmed, isUser, isLastLine && isStreaming)}
          </p>
        );
      }
    });

    if (inCodeBlock && codeLines.length > 0) {
      const codeText = codeLines.join('\n');
      renderedElements.push(
        <CodeBlock key="code-unclosed" language={codeLanguage} code={codeText} isStreaming={isStreaming} />
      );
    }

    flushList('end', true);
    return renderedElements;
  };

  const ProgressCircle = ({ score, label, colorClass }) => {
    const radius = 32;
    const stroke = 5;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
      <div className="flex flex-col items-center gap-2 animate-fade-in">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 64 64">
            <circle
              className="text-[#f0f0ee] dark:text-[#222222]"
              strokeWidth={stroke}
              stroke="currentColor"
              fill="transparent"
              r={normalizedRadius}
              cx="32"
              cy="32"
            />
            <circle
              className={colorClass}
              strokeWidth={stroke}
              strokeDasharray={circumference + ' ' + circumference}
              style={{ strokeDashoffset }}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r={normalizedRadius}
              cx="32"
              cy="32"
            />
          </svg>
          <span className="absolute text-[15px] font-mono font-bold text-[#080808] dark:text-[#f5f5f3]">{score}%</span>
        </div>
        <span className="text-[9px] font-mono text-[#a0a09a] uppercase tracking-wider text-center">{label}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#f5f5f3] overflow-hidden">
      
      {/* Centered chat column wrapper */}
      <div className="max-w-4xl mx-auto w-full h-full bg-white dark:bg-[#121212] border-y-0 md:border-x border-border flex flex-col overflow-hidden relative">
        
        {/* Toggle Mode Selector Header */}
        <div className="px-5 py-3 border-b border-border flex justify-between items-center bg-white dark:bg-[#121212] z-10 shrink-0">
          <div className="flex border border-[#e4e4e0] dark:border-[#222222] rounded-full p-0.5 text-[9.5px] font-mono bg-[#f5f5f3] dark:bg-[#1c1c1c]">
            <button
              onClick={() => setChatMode('chat')}
              className={`px-3.5 py-1 rounded-full text-center transition-all ${chatMode === 'chat' ? 'bg-[#080808] text-white dark:bg-[#f5f5f3] dark:text-[#080808]' : 'text-[#5a5a55] hover:text-[#080808] dark:text-[#a0a09a]'}`}
            >
              AI Mentor Chat
            </button>
            <button
              onClick={() => setChatMode('feynman')}
              className={`px-3.5 py-1 rounded-full text-center transition-all ${chatMode === 'feynman' ? 'bg-[#080808] text-white dark:bg-[#f5f5f3] dark:text-[#080808]' : 'text-[#5a5a55] hover:text-[#080808] dark:text-[#a0a09a]'}`}
            >
              Feynman Teaching Arena
            </button>
          </div>
          <div className="flex items-center gap-1.5 border border-[#e4e4e0] dark:border-[#222222] rounded-full px-3 py-1 bg-[#fafaf9] dark:bg-[#1c1c1c]">
            <div className="w-[5px] h-[5px] rounded-full bg-[#22c55e] live-dot"></div>
            <span className="text-[10px] font-mono text-[#5a5a55] dark:text-[#a0a09a]">System Active</span>
          </div>
        </div>

        {chatMode === 'chat' ? (
          <>
            {/* Mentor Header */}
            <div className="px-5 py-3 border-b border-border flex justify-between items-center bg-white dark:bg-[#121212] shrink-0">
              <div>
                <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase tracking-widest block">AI Learning Mentor</span>
                <h2 className="text-[15px] font-semibold text-[#080808] dark:text-[#f5f5f3]">Conversation Feed</h2>
              </div>
              <div className="text-[10px] font-mono text-[#a0a09a]">
                Kimi-k2.6 Agent
              </div>
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#fafaf9] dark:bg-[#121212]/50">
              {chatHistory.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[75%] ${isUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                  >
                    <span className="text-[9px] font-mono text-[#a0a09a] mb-1 px-1.5 uppercase tracking-wider font-semibold">
                      {isUser ? 'You' : 'AI Mentor'}
                    </span>
                    <div
                      className={`p-4 rounded-[22px] text-[13.5px] leading-relaxed shadow-[0_1px_4px_rgba(8,8,8,0.02)] ${
                        isUser 
                          ? 'bg-[#080808] text-white rounded-tr-[4px]' 
                          : 'bg-white border border-[#e8e8e4] text-[#080808] rounded-tl-[4px] dark:bg-[#1c1c1c] dark:border-[#222222]'
                      }`}
                    >
                      <div className="space-y-1">
                        {!isUser && msg.retrievedSources && msg.retrievedSources.length > 0 && (
                          <RAGSources sources={msg.retrievedSources} />
                        )}
                        {!isUser && msg.isStreaming && !msg.text ? (
                          <div className="flex items-center gap-1.5 py-1 px-1">
                            <div className="w-1.5 h-1.5 bg-[#a0a09a] rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '0.8s' }}></div>
                            <div className="w-1.5 h-1.5 bg-[#a0a09a] rounded-full animate-bounce" style={{ animationDelay: '0.16s', animationDuration: '0.8s' }}></div>
                            <div className="w-1.5 h-1.5 bg-[#a0a09a] rounded-full animate-bounce" style={{ animationDelay: '0.32s', animationDuration: '0.8s' }}></div>
                            <span className="text-[11px] font-mono text-[#a0a09a] ml-1">Thinking...</span>
                          </div>
                        ) : (
                          renderChatMarkdown(msg.text, isUser, msg.isStreaming)
                        )}
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-[#a0a09a] mt-1 px-1.5">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}

              {/* Typing bounce loaders */}
              {isLoading && (
                <div className="flex flex-col max-w-[75%] mr-auto items-start">
                  <span className="text-[9px] font-mono text-[#a0a09a] mb-1 px-1.5 uppercase tracking-wider font-semibold">
                    AI Mentor
                  </span>
                  <div className="bg-white border border-[#e8e8e4] dark:bg-[#1c1c1c] dark:border-[#222222] p-3.5 rounded-[22px] rounded-tl-[4px] shadow-[0_1px_4px_rgba(8,8,8,0.02)]">
                    <div className="flex items-center gap-1.5 py-1 px-1">
                      <div className="w-1.5 h-1.5 bg-[#a0a09a] rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '0.8s' }}></div>
                      <div className="w-1.5 h-1.5 bg-[#a0a09a] rounded-full animate-bounce" style={{ animationDelay: '0.16s', animationDuration: '0.8s' }}></div>
                      <div className="w-1.5 h-1.5 bg-[#a0a09a] rounded-full animate-bounce" style={{ animationDelay: '0.32s', animationDuration: '0.8s' }}></div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-white dark:bg-[#1c1c1c] border border-[#ef4444]/20 rounded-[12px] flex items-center gap-2.5 max-w-sm mx-auto">
                  <AlertCircle className="w-4 h-4 stroke-[#ef4444]" strokeWidth={1.5} />
                  <span className="text-[11px] text-[#ef4444] font-mono leading-tight">{error}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggestion Chips */}
            {chatHistory.length > 0 && chatHistory[chatHistory.length - 1]?.suggestions?.length > 0 && !isLoading && (
              <div className="px-5 py-2.5 flex gap-1.5 overflow-x-auto whitespace-nowrap bg-white dark:bg-[#121212] border-t border-[#ebebea] dark:border-[#222222] shrink-0">
                {chatHistory[chatHistory.length - 1].suggestions.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(sug)}
                    className="border border-[#e4e4e0] dark:border-[#222222] bg-[#fafaf9] dark:bg-[#1c1c1c] rounded-full px-3.5 py-1.5 text-[11px] font-mono font-light text-[#5a5a55] dark:text-[#a0a09a] hover:border-[#a0a09a] active:scale-95 transition-all shrink-0"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}

            {/* Input box */}
            <div className="p-5 bg-white dark:bg-[#121212] border-t border-[#ebebea] dark:border-[#222222] shrink-0">
              <div className="flex items-center gap-2 relative bg-[#f5f5f3] dark:bg-[#1c1c1c] rounded-full px-4 py-2 border border-transparent focus-within:border-[#a0a09a] transition-all">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="Ask the mentor about your files or study path..."
                  className="flex-1 bg-transparent border-none outline-none ring-0 text-[13.5px] py-1 text-[#080808] placeholder-[#c0c0bc] focus:ring-0 dark:text-[#f5f5f3] dark:placeholder-[#5a5a55]"
                  disabled={isLoading}
                />
                <button
                  onClick={() => handleSubmit()}
                  disabled={isLoading || !inputText.trim()}
                  className="p-2 bg-[#080808] dark:bg-[#f5f5f3] rounded-full active:scale-90 transition-transform disabled:opacity-30"
                >
                  <Send className="w-3.5 h-3.5 stroke-white dark:stroke-[#080808]" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* FEYNMAN ACTIVE TEACHING ARENA MODE */
          <>
            {/* Feynman Header */}
            <div className="px-5 py-3 border-b border-border flex justify-between items-center bg-white dark:bg-[#121212] shrink-0">
              <div>
                <span className="text-[9px] font-mono font-light text-amber-500 uppercase tracking-widest block font-bold">Active Cognitive Learning</span>
                <h2 className="text-[15px] font-semibold text-[#080808] dark:text-[#f5f5f3]">Feynman Teaching Arena</h2>
              </div>
              <div className="text-[10px] font-mono text-[#a0a09a]">
                Student Roleplay Model
              </div>
            </div>

            {!feynmanTopic ? (
              /* ONBOARDING SCREEN */
              <div className="flex-1 flex flex-col justify-center items-center p-8 text-center max-w-md mx-auto space-y-6">
                <div className="p-4 bg-amber-500/10 rounded-full border border-amber-500/20">
                  <Sparkles className="w-8 h-8 text-amber-500" strokeWidth={1.5} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-[16px] font-bold text-[#080808] dark:text-[#f5f5f3]">Teach Toby to Master Concepts</h3>
                  <p className="text-[12px] text-[#5a5a55] dark:text-[#a0a09a] leading-relaxed">
                    Explain a concept in very simple, jargon-free analogies to **Toby**, a virtual 10-year-old student. Toby will ask questions. Toby will assess your explanation simplicity, accuracy, and point out conceptual gaps!
                  </p>
                </div>

                <div className="w-full space-y-4">
                  <div className="flex flex-col gap-1.5 text-left">
                    <span className="text-[9px] font-mono text-[#a0a09a] uppercase pl-1">Select Study Concept</span>
                    <select
                      value={selectedDropdownTopic}
                      onChange={(e) => setSelectedDropdownTopic(e.target.value)}
                      className="w-full bg-[#f5f5f3] dark:bg-[#1c1c1c] border border-[#e4e4e0] dark:border-[#222222] text-[#080808] dark:text-[#f5f5f3] text-[12.5px] rounded-[14px] px-3.5 py-2.5 font-sans focus:outline-none"
                    >
                      {topicsList.map((topic, i) => (
                        <option key={i} value={topic}>{topic}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => handleStartFeynman(selectedDropdownTopic)}
                    className="w-full bg-[#080808] dark:bg-[#f5f5f3] text-white dark:text-[#080808] rounded-full py-3 text-[11px] font-mono font-semibold hover:opacity-90 transition-all active:scale-95 text-center"
                  >
                    Start Active Teaching Session
                  </button>
                </div>
              </div>
            ) : feynmanAssessment ? (
              /* SOCRATIC COGNITIVE ASSESSMENT REPORT */
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#fafaf9] dark:bg-[#121212]/30 animate-fade-in text-left">
                
                {/* Score Dashboard Header */}
                <div className="bg-white dark:bg-[#1c1c1c] border border-[#e8e8e4] dark:border-[#222222] rounded-[24px] p-6 space-y-4 shadow-subtle">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-[9px] font-mono text-amber-500 uppercase font-bold block">Socratic Report</span>
                      <h3 className="text-[16px] font-bold text-[#080808] dark:text-[#f5f5f3]">Feynman Explanation Review</h3>
                    </div>
                    <span className="text-[10px] font-mono text-[#a0a09a]">{feynmanTopic}</span>
                  </div>

                  <div className="flex justify-around items-center pt-3 border-t border-[#f0f0ee] dark:border-[#222222]">
                    <ProgressCircle score={feynmanAssessment.simplicityScore} label="Simplicity Score" colorClass="text-blue-500" />
                    <ProgressCircle score={feynmanAssessment.accuracyScore} label="Factual Accuracy" colorClass="text-emerald-500" />
                  </div>
                </div>

                {/* Cognitive feedback statement */}
                <div className="bg-white dark:bg-[#1c1c1c] border border-[#e8e8e4] dark:border-[#222222] rounded-[24px] p-5 space-y-2">
                  <span className="text-[9px] font-mono text-[#a0a09a] uppercase block">Toby's Class Diary Summary</span>
                  <p className="text-[12.5px] text-[#5a5a55] dark:text-[#a0a09a] leading-relaxed font-sans whitespace-pre-wrap">
                    {feynmanAssessment.feedback}
                  </p>
                </div>

                {/* Gaps and Strengths grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strengths card */}
                  <div className="bg-white dark:bg-[#1c1c1c] border border-[#e8e8e4]/50 dark:border-[#222222]/50 rounded-[20px] p-5 space-y-3">
                    <span className="text-[9.5px] font-mono text-[#22c55e] uppercase block font-bold">Teaching Strengths</span>
                    <ul className="space-y-2">
                      {feynmanAssessment.strengths?.map((st, i) => (
                        <li key={i} className="flex gap-2.5 items-start text-[11.5px] text-[#5a5a55] dark:text-[#a0a09a] leading-normal font-mono">
                          <span className="text-[#22c55e] font-bold">✓</span>
                          <span>{st}</span>
                        </li>
                      ))}
                      {(!feynmanAssessment.strengths || feynmanAssessment.strengths.length === 0) && (
                        <span className="text-[11px] text-[#a0a09a] italic font-mono block">No explicit strengths listed. Try using analogical terms!</span>
                      )}
                    </ul>
                  </div>

                  {/* Conceptual Gaps card */}
                  <div className="bg-white dark:bg-[#1c1c1c] border border-[#e8e8e4]/50 dark:border-[#222222]/50 rounded-[20px] p-5 space-y-3">
                    <span className="text-[9.5px] font-mono text-[#ef4444] uppercase block font-bold">Cognitive Gaps Identified</span>
                    <ul className="space-y-2">
                      {feynmanAssessment.gapsIdentified?.map((gap, i) => (
                        <li key={i} className="flex gap-2.5 items-start text-[11.5px] text-[#5a5a55] dark:text-[#a0a09a] leading-normal font-mono">
                          <span className="text-[#ef4444] font-bold">!</span>
                          <span>{gap}</span>
                        </li>
                      ))}
                      {(!feynmanAssessment.gapsIdentified || feynmanAssessment.gapsIdentified.length === 0) && (
                        <span className="text-[11px] text-[#22c55e] italic font-mono block">Zero gaps identified! Toby fully mastered the concepts!</span>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Action button reset */}
                <button
                  onClick={() => {
                    setFeynmanTopic('');
                    setFeynmanAssessment(null);
                    setFeynmanChat([]);
                  }}
                  className="w-full bg-[#080808] dark:bg-[#f5f5f3] text-white dark:text-[#080808] rounded-full py-3.5 text-[11px] font-mono font-semibold hover:opacity-90 transition-all active:scale-95 text-center block"
                >
                  Teach Another Concept
                </button>

              </div>
            ) : (
              /* DYNAMIC TEACHING CHAT TIMELINE */
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#fafaf9] dark:bg-[#121212]/50 text-left">
                  
                  {/* Assessment Warning top strip */}
                  <div className="bg-amber-500/5 border border-amber-500/10 dark:border-amber-500/20 rounded-[16px] p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                    <div className="space-y-0.5">
                      <span className="text-[12px] font-bold text-[#080808] dark:text-[#f5f5f3]">Explain simply to Toby</span>
                      <p className="text-[10.5px] text-[#5a5a55] dark:text-[#a0a09a] leading-normal">
                        Avoid using equations or jargon without explaining them first. Toby will answer based on how clearly you explain.
                      </p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => {
                          setFeynmanTopic('');
                          setFeynmanChat([]);
                          setFeynmanAssessment(null);
                        }}
                        className="border border-[#e4e4e0] dark:border-[#222222] hover:bg-black/5 dark:hover:bg-white/5 text-[#5a5a55] dark:text-[#a0a09a] rounded-full px-4 py-2 text-[10.5px] font-mono font-semibold transition-all active:scale-95 whitespace-nowrap"
                      >
                        Exit Session
                      </button>
                      <button
                        onClick={handleAssessFeynman}
                        disabled={feynmanChat.length < 3 || feynmanLoading || feynmanAssessing}
                        className="bg-amber-500 hover:bg-amber-600 disabled:opacity-30 text-white rounded-full px-4 py-2 text-[10.5px] font-mono font-semibold transition-all active:scale-95 shrink-0 whitespace-nowrap"
                      >
                        {feynmanAssessing ? 'Assessing...' : 'Assess'}
                      </button>
                    </div>
                  </div>

                  {/* Feynman dialog timeline */}
                  {feynmanChat.map((msg) => {
                    const isUser = msg.sender === 'user';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[75%] ${isUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                      >
                        <span className="text-[9px] font-mono text-[#a0a09a] mb-1 px-1.5 uppercase tracking-wider font-semibold">
                          {isUser ? 'You (Teacher)' : 'Toby (Student)'}
                        </span>
                        <div
                          className={`p-4 rounded-[22px] text-[13.5px] leading-relaxed shadow-[0_1px_4px_rgba(8,8,8,0.02)] ${
                            isUser 
                              ? 'bg-[#080808] text-white rounded-tr-[4px]' 
                              : 'bg-white border border-[#e8e8e4] text-[#080808] rounded-tl-[4px] dark:bg-[#1c1c1c] dark:border-[#222222]'
                          }`}
                        >
                          <div className="space-y-1">
                            {!isUser && msg.isStreaming && !msg.text ? (
                              <div className="flex items-center gap-1.5 py-1 px-1">
                                <div className="w-1.5 h-1.5 bg-[#a0a09a] rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '0.8s' }}></div>
                                <div className="w-1.5 h-1.5 bg-[#a0a09a] rounded-full animate-bounce" style={{ animationDelay: '0.16s', animationDuration: '0.8s' }}></div>
                                <div className="w-1.5 h-1.5 bg-[#a0a09a] rounded-full animate-bounce" style={{ animationDelay: '0.32s', animationDuration: '0.8s' }}></div>
                                <span className="text-[11px] font-mono text-[#a0a09a] ml-1">Thinking...</span>
                              </div>
                            ) : (
                              renderChatMarkdown(msg.text, isUser, msg.isStreaming)
                            )}
                          </div>
                        </div>
                        <span className="text-[9px] font-mono text-[#a0a09a] mt-1 px-1.5">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}

                  {feynmanLoading && !feynmanChat[feynmanChat.length - 1]?.isStreaming && (
                    <div className="flex flex-col max-w-[75%] mr-auto items-start">
                      <span className="text-[9px] font-mono text-[#a0a09a] mb-1 px-1.5 uppercase tracking-wider font-semibold">
                        Toby (Student)
                      </span>
                      <div className="bg-white border border-[#e8e8e4] dark:bg-[#1c1c1c] dark:border-[#222222] p-3.5 rounded-[22px] rounded-tl-[4px] shadow-[0_1px_4px_rgba(8,8,8,0.02)]">
                        <div className="flex items-center gap-1.5 py-1 px-1">
                          <div className="w-1.5 h-1.5 bg-[#a0a09a] rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '0.8s' }}></div>
                          <div className="w-1.5 h-1.5 bg-[#a0a09a] rounded-full animate-bounce" style={{ animationDelay: '0.16s', animationDuration: '0.8s' }}></div>
                          <div className="w-1.5 h-1.5 bg-[#a0a09a] rounded-full animate-bounce" style={{ animationDelay: '0.32s', animationDuration: '0.8s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="p-3 bg-white dark:bg-[#1c1c1c] border border-[#ef4444]/20 rounded-[12px] flex items-center gap-2.5 max-w-sm mx-auto">
                      <AlertCircle className="w-4 h-4 stroke-[#ef4444]" strokeWidth={1.5} />
                      <span className="text-[11px] text-[#ef4444] font-mono leading-tight">{error}</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input box */}
                <div className="p-5 bg-white dark:bg-[#121212] border-t border-[#ebebea] dark:border-[#222222] shrink-0">
                  <div className="flex items-center gap-2 relative bg-[#f5f5f3] dark:bg-[#1c1c1c] rounded-full px-4 py-2 border border-transparent focus-within:border-[#a0a09a] transition-all">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendFeynman()}
                      placeholder="Explain the topic here in simple terms..."
                      className="flex-1 bg-transparent border-none outline-none ring-0 text-[13.5px] py-1 text-[#080808] placeholder-[#c0c0bc] focus:ring-0 dark:text-[#f5f5f3] dark:placeholder-[#5a5a55]"
                      disabled={feynmanLoading}
                    />
                    <button
                      onClick={() => handleSendFeynman()}
                      disabled={feynmanLoading || !inputText.trim()}
                      className="p-2 bg-[#080808] dark:bg-[#f5f5f3] rounded-full active:scale-90 transition-transform disabled:opacity-30"
                    >
                      <Send className="w-3.5 h-3.5 stroke-white dark:stroke-[#080808]" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

      </div>
    </div>
  );
}
