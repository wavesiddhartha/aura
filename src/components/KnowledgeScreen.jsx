import React, { useState } from 'react';
import { BookOpen, AlertTriangle, CheckCircle, Clock, ChevronRight, Zap, Sparkles } from 'lucide-react';

const peerData = {
  aria: {
    fullName: "Aria Chen",
    domain: "Software/SaaS",
    yourStrengths: [
      { name: "Neural Networks", x: 130, y: 100 },
      { name: "Machine Learning", x: 110, y: 160 }
    ],
    sharedMastery: [
      { name: "Computer Science", x: 250, y: 80 },
      { name: "Linear Momentum", x: 250, y: 180 }
    ],
    peerStrengths: [
      { name: "Vector Databases", x: 370, y: 100 },
      { name: "Software Design", x: 390, y: 160 }
    ],
    mentorText: "Explain **Neural Networks** or **Machine Learning** to your peer. They currently struggle with deep learning concepts.",
    menteeText: "Set up a segment where they explain **Vector Databases** or **Software Design fundamentals** to you."
  },
  leo: {
    fullName: "Leo Vance",
    domain: "Physics/Mechanics",
    yourStrengths: [
      { name: "SaaS Pricing", x: 130, y: 100 },
      { name: "Growth Channels", x: 110, y: 160 }
    ],
    sharedMastery: [
      { name: "Computer Science", x: 250, y: 80 },
      { name: "Machine Learning", x: 250, y: 180 }
    ],
    peerStrengths: [
      { name: "Newton's Laws", x: 370, y: 100 },
      { name: "Friction Forces", x: 390, y: 160 }
    ],
    mentorText: "Explain **SaaS Pricing** or **Growth Channels** to your peer. They currently struggle with business operations.",
    menteeText: "Set up a segment where they explain **Newton's Laws** or **Friction Forces** to you."
  },
  maya: {
    fullName: "Maya Patel",
    domain: "Business/Launch",
    yourStrengths: [
      { name: "Neural Networks", x: 130, y: 100 },
      { name: "Newton's Laws", x: 110, y: 160 }
    ],
    sharedMastery: [
      { name: "Machine Learning", x: 250, y: 80 },
      { name: "Computer Science", x: 250, y: 180 }
    ],
    peerStrengths: [
      { name: "Product Pricing", x: 370, y: 100 },
      { name: "Launch Timelines", x: 390, y: 160 }
    ],
    mentorText: "Explain **Neural Networks** or **Newton's Laws** to your peer. They currently struggle with computational modeling.",
    menteeText: "Set up a segment where they explain **Product Pricing** or **Launch Timelines** to you."
  }
};

const conceptDescriptions = {
  bgmibattlegroundsmobileindia: "Battlegrounds Mobile India (BGMI) is a localized mobile battle royale game. Learning metrics focus on tactical decision-making, stream commentary, and audience engagement analysis.",
  pubgmobile: "PlayerUnknown's Battlegrounds Mobile. Spaced recall tracks weapon mechanics, recoil control patterns, and circle positioning strategies.",
  gamingcommentary: "Formulating verbal hooks, audience retention loops, and pacing strategies for live streams and content creation.",
  computersciencefundamentals: "Foundational hardware/software interface principles, CPU architectures, data representation, and binary logic systems.",
  definitionofcomputer: "Historical, theoretical, and architectural models of computers, centering on the von Neumann model and Church-Turing limits.",
  computingconcepts: "The study of algorithmic complexity, Turing machines, computation limits, and systemic input/processing/output paradigms.",
  insufficientdata: "Placeholder concept generated from low-quality audio or missing transcription fragments, prompting technical review of hardware audio streams.",
  neuralnetworks: "Mathematical modeling of layered nodes ($z = Wx + b$), backpropagation algorithms, weight initialization (Xavier, He), and modern neural activation functions (ReLU, Sigmoid).",
  machinelearning: "Pattern recognition algorithms, optimization routines, cost function minimization (Gradient Descent), and supervised/unsupervised training paradigms."
};

const renderBoldText = (text) => {
  const parts = text.split('**');
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold text-text-primary dark:text-[#f5f5f3]">{part}</strong> : part);
};

export default function KnowledgeScreen({ knowledgeModel, onAskMentor }) {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'graph' | 'paths' | 'sync'
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedNodeLabel, setSelectedNodeLabel] = useState('');
  const [selectedPeer, setSelectedPeer] = useState('aria');

  const handleTopicClick = (topicName) => {
    const nodeId = topicName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    setSelectedNode(nodeId);
    setSelectedNodeLabel(topicName);
  };

  if (!knowledgeModel || !knowledgeModel.topicsMastered) {
    return (
      <div className="flex items-center justify-center h-full bg-[#f5f5f3]">
        <span className="text-[11px] font-mono text-[#a0a09a] animate-pulse">Loading personal knowledge profile...</span>
      </div>
    );
  }

  // Node coordination dynamically generated for the interactive SVG Knowledge Graph
  const generateDynamicGraph = () => {
    const mastered = knowledgeModel.topicsMastered || [];
    const struggling = knowledgeModel.topicsStruggling || [];
    const allTopics = [];
    const seen = new Set();
    
    struggling.forEach(t => {
      const lower = t.name.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        allTopics.push({
          id: t.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
          label: t.name,
          score: t.score,
          struggle: true,
          reason: t.reason
        });
      }
    });

    mastered.forEach(t => {
      const lower = t.name.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        allTopics.push({
          id: t.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
          label: t.name,
          score: t.score,
          struggle: false
        });
      }
    });

    const domains = { physics: [], business: [], tech: [], general: [] };
    allTopics.forEach(node => {
      const name = node.label.toLowerCase();
      if (name.includes('newton') || name.includes('friction') || name.includes('momentum') || name.includes('physic') || name.includes('force')) {
        node.category = 'physics';
        domains.physics.push(node);
      } else if (name.includes('saas') || name.includes('price') || name.includes('pricing') || name.includes('launch') || name.includes('busines') || name.includes('sales') || name.includes('timeline') || name.includes('market')) {
        node.category = 'business';
        domains.business.push(node);
      } else if (name.includes('comput') || name.includes('database') || name.includes('vector') || name.includes('operat') || name.includes('fundamental') || name.includes('data') || name.includes('tech') || name.includes('system') || name.includes('utterance') || name.includes('neural') || name.includes('learning') || name.includes('ml') || name.includes('ai')) {
        node.category = 'tech';
        domains.tech.push(node);
      } else {
        node.category = 'general';
        domains.general.push(node);
      }
    });

    const nodes = [];
    const categories = ['physics', 'tech', 'general', 'business'];
    const xCoords = { physics: 60, tech: 150, general: 270, business: 360 };

    categories.forEach(cat => {
      const list = domains[cat];
      const count = list.length;
      if (count === 0) return;
      
      const x = xCoords[cat];
      const startY = 70;
      const endY = 310;
      const step = count > 1 ? (endY - startY) / (count - 1) : 0;
      
      list.forEach((node, idx) => {
        node.x = x + (idx % 2 === 0 ? -15 : 15);
        node.y = count > 1 ? startY + idx * step : (startY + endY) / 2;
        node.labelPosition = idx % 2 === 0 ? 'top' : 'bottom';
        nodes.push(node);
      });
    });

    const edges = [];
    categories.forEach(cat => {
      const list = domains[cat];
      for (let i = 0; i < list.length - 1; i++) {
        edges.push({ from: list[i].id, to: list[i + 1].id });
      }
    });

    const minLen = Math.min(domains.physics.length, domains.tech.length);
    for (let i = 0; i < minLen; i++) {
      edges.push({ from: domains.physics[i].id, to: domains.tech[i].id });
    }
    const minLen2 = Math.min(domains.tech.length, domains.business.length);
    for (let i = 0; i < minLen2; i++) {
      edges.push({ from: domains.tech[i].id, to: domains.business[i].id });
    }
    const minLen3 = Math.min(domains.general.length, domains.business.length);
    for (let i = 0; i < minLen3; i++) {
      edges.push({ from: domains.general[i].id, to: domains.business[i].id });
    }

    return { nodes, edges };
  };

  const { nodes: graphNodes, edges: graphEdges } = generateDynamicGraph();
  const currentPeer = peerData[selectedPeer] || peerData.aria;

  return (
    <div className="flex flex-col h-full bg-[#f5f5f3] overflow-y-auto">
      
      {/* Header Profile Dashboard */}
      <div className="px-6 pt-5 pb-4 bg-white border-b border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase tracking-widest block">Continuous Learning Memory</span>
            <h2 className="text-[18px] font-semibold text-[#080808]">Personal Knowledge Model</h2>
          </div>
          
          {/* Top metrics dashboard */}
          <div className="flex flex-wrap gap-6 items-center pt-2 md:pt-0">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 stroke-[#5a5a55]" strokeWidth={1.5} />
              <div>
                <span className="text-[8px] font-mono text-[#b0b0a8] block uppercase">Hours Logged</span>
                <span className="text-[13px] font-mono font-semibold text-[#080808]">{knowledgeModel.studyHours}h</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 stroke-[#5a5a55]" strokeWidth={1.5} />
              <div>
                <span className="text-[8px] font-mono text-[#b0b0a8] block uppercase">Study Files</span>
                <span className="text-[13px] font-mono font-semibold text-[#080808]">{knowledgeModel.totalSessions}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 stroke-[#5a5a55]" strokeWidth={1.5} />
              <div>
                <span className="text-[8px] font-mono text-[#b0b0a8] block uppercase">Avg Mastery</span>
                <span className="text-[13px] font-mono font-semibold text-[#080808]">
                  {Math.round(
                    (knowledgeModel.topicsMastered.reduce((acc, t) => acc + t.score, 0) / 
                     knowledgeModel.topicsMastered.length) || 0
                  )}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="max-w-7xl mx-auto mt-5">
          <div className="flex border border-[#e4e4e0] rounded-full p-0.5 text-[10px] font-mono bg-[#f5f5f3] max-w-md">
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex-1 py-1.5 rounded-full text-center transition-all ${activeTab === 'summary' ? 'bg-[#080808] text-white dark:bg-[#f5f5f3] dark:text-[#080808]' : 'text-[#5a5a55] hover:text-[#080808] dark:text-[#a0a09a] dark:hover:text-[#f5f5f3]'}`}
            >
              Mastery Insights
            </button>
            <button
              onClick={() => setActiveTab('graph')}
              className={`flex-1 py-1.5 rounded-full text-center transition-all ${activeTab === 'graph' ? 'bg-[#080808] text-white dark:bg-[#f5f5f3] dark:text-[#080808]' : 'text-[#5a5a55] hover:text-[#080808] dark:text-[#a0a09a] dark:hover:text-[#f5f5f3]'}`}
            >
              Concept Graph
            </button>
            <button
              onClick={() => setActiveTab('paths')}
              className={`flex-1 py-1.5 rounded-full text-center transition-all ${activeTab === 'paths' ? 'bg-[#080808] text-white dark:bg-[#f5f5f3] dark:text-[#080808]' : 'text-[#5a5a55] hover:text-[#080808] dark:text-[#a0a09a] dark:hover:text-[#f5f5f3]'}`}
            >
              Learning Paths
            </button>
            <button
              onClick={() => setActiveTab('sync')}
              className={`flex-1 py-1.5 rounded-full text-center transition-all ${activeTab === 'sync' ? 'bg-[#080808] text-white dark:bg-[#f5f5f3] dark:text-[#080808]' : 'text-[#5a5a55] hover:text-[#080808] dark:text-[#a0a09a] dark:hover:text-[#f5f5f3]'}`}
            >
              Co-op Sync
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          
          {/* TAB 1: SUMMARY INSIGHTS (Split dual panel on desktop) */}
          {activeTab === 'summary' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Mastery progress list (takes 7 cols) */}
              <div className="lg:col-span-7 bg-white border border-[#e8e8e4] rounded-[24px] p-6 space-y-4">
                <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase tracking-widest block">Topic Mastery Proficiencies</span>
                
                <div className="grid grid-cols-1 gap-3">
                  {knowledgeModel.topicsMastered.map((topic, idx) => (
                    <div key={idx} onClick={() => handleTopicClick(topic.name)} className="p-4 bg-[#f5f5f3]/40 border border-[#ebebea] hover:border-[#a0a09a] transition-all active:scale-[0.99] cursor-pointer rounded-[16px] space-y-2">
                      <div className="flex justify-between items-center text-[12px]">
                        <span className="font-semibold text-[#080808]">{topic.name}</span>
                        <span className="font-mono text-[#5a5a55]">{topic.score}%</span>
                      </div>
                      <div className="w-full h-1 bg-[#f5f5f3] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#080808] dark:bg-[#f5f5f3] rounded-full"
                          style={{ width: `${topic.score}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Struggles & Weak points diagnostic (takes 5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase tracking-widest block">Struggling Concepts (Attention Required)</span>
                
                <div className="space-y-3">
                  {knowledgeModel.topicsStruggling.map((topic, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleTopicClick(topic.name)}
                      className="p-4 bg-white border border-[#ef4444]/20 hover:border-[#ef4444]/55 transition-all active:scale-[0.99] cursor-pointer rounded-[20px] flex gap-3"
                    >
                      <div className="p-1 rounded-full bg-[#ef4444]/10 self-start">
                        <AlertTriangle className="w-4 h-4 stroke-[#ef4444]" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-baseline">
                          <h4 className="text-[13px] font-semibold text-[#080808]">{topic.name}</h4>
                          <span className="text-[11px] font-mono text-[#ef4444] font-medium">{topic.score}%</span>
                        </div>
                        <p className="text-[11px] text-[#5a5a55] leading-normal font-mono">{topic.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: INTERACTIVE SVG CONCEPT GRAPH */}
          {activeTab === 'graph' && (
            <div className="space-y-4 flex flex-col">
              <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase tracking-widest block">Interactive Concept Topology</span>
              
              <div className="bg-white border border-[#e8e8e4] rounded-[24px] relative overflow-hidden flex items-center justify-center min-h-[420px] aspect-[16/7]">
                <svg className="w-full h-full absolute inset-0" viewBox="0 0 420 380">
                  {/* Connective lines */}
                  {graphEdges.map((edge, idx) => {
                    const fromNode = graphNodes.find(n => n.id === edge.from);
                    const toNode = graphNodes.find(n => n.id === edge.to);
                    if (!fromNode || !toNode) return null;
                    return (
                      <line
                        key={idx}
                        x1={fromNode.x}
                        y1={fromNode.y}
                        x2={toNode.x}
                        y2={toNode.y}
                        stroke={
                          (hoveredNode === edge.from || hoveredNode === edge.to)
                            ? '#080808'
                            : '#ebebea'
                        }
                        strokeWidth={
                          (hoveredNode === edge.from || hoveredNode === edge.to) ? 1.5 : 1
                        }
                        className="transition-all duration-200"
                      />
                    );
                  })}

                  {/* Nodes circles */}
                  {graphNodes.map((node) => (
                    <g
                      key={node.id}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      onClick={() => handleTopicClick(node.label)}
                    >
                      {node.struggle && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={14}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth={1}
                          className="animate-ping opacity-25"
                          style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                        />
                      )}
                      
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={7}
                        fill={node.struggle ? '#ef4444' : '#080808'}
                        stroke="white"
                        strokeWidth={2}
                        className="transition-transform duration-150 hover:scale-125"
                      />
                      
                      <text
                        x={node.x}
                        y={node.labelPosition === 'top' ? node.y - 14 : node.y + 18}
                        textAnchor="middle"
                        className="text-[9.5px] font-mono fill-text-primary tracking-tight font-medium"
                      >
                        {node.label}
                      </text>
                    </g>
                  ))}
                </svg>

                {/* Overlaid HUD Panel */}
                <div className="absolute bottom-4 left-4 right-4 p-4 bg-white/95 backdrop-blur border border-[#e4e4e0] rounded-[16px] flex items-center justify-between pointer-events-none max-w-md mx-auto shadow-subtle">
                  {hoveredNode ? (
                    (() => {
                      const node = graphNodes.find(n => n.id === hoveredNode);
                      return (
                        <>
                          <div>
                            <span className="text-[12px] font-semibold text-[#080808] block">{node.label}</span>
                            <span className="text-[9px] font-mono text-[#a0a09a] uppercase">{node.category} domain</span>
                          </div>
                          <div className="text-right">
                            <span className={`text-[13px] font-mono font-bold ${node.struggle ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>
                              {node.score}% Mastery
                            </span>
                            <span className="text-[9px] font-mono text-[#a0a09a] block">
                              {node.struggle ? 'Needs Review' : 'Proficient'}
                            </span>
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <div className="w-full text-center">
                      <span className="text-[11px] font-mono text-[#a0a09a]">Hover graph nodes to inspect conceptual connections and details</span>
                    </div>
                  )}
                </div>

                {/* Concept Detail Drawer */}
                {selectedNode && (
                  (() => {
                    let node = graphNodes.find(n => n.id === selectedNode);
                    if (!node) {
                      node = {
                        id: selectedNode,
                        label: selectedNodeLabel || "Concept Detail",
                        score: 75,
                        category: 'general',
                        struggle: false
                      };
                    }
                    const desc = conceptDescriptions[node.id] || "An active concept indexed in your personal knowledge profile. Review related sessions and flashcards to increase your mastery.";
                    return (
                      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] z-30 flex items-end justify-center transition-all duration-300">
                        <div className="bg-white dark:bg-[#121212] w-full max-w-xl rounded-t-[32px] border-t border-[#e8e8e4] dark:border-[#222222] p-6 space-y-5 shadow-premium animate-slide-up max-h-[85%] overflow-y-auto pointer-events-auto text-left">
                          
                          {/* Header */}
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase tracking-widest block">{node.category} domain</span>
                              <h3 className="text-[17px] font-bold text-[#080808] dark:text-[#f5f5f3]">{node.label}</h3>
                            </div>
                            <button 
                              onClick={() => setSelectedNode(null)}
                              className="p-1.5 rounded-full bg-[#f5f5f3] dark:bg-[#1c1c1c] text-[#5a5a55] hover:text-[#080808] dark:hover:text-[#f5f5f3] transition-all active:scale-90"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>

                          {/* Metrics Row */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-[#f5f5f3] dark:bg-[#1c1c1c] rounded-[16px] border border-[#ebebea] dark:border-[#222222] text-center">
                              <span className="text-[8.5px] font-mono text-[#a0a09a] block uppercase">Mastery Proficiency</span>
                              <span className={`text-[17px] font-mono font-bold ${node.struggle ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>{node.score}%</span>
                            </div>
                            <div className="p-3 bg-[#f5f5f3] dark:bg-[#1c1c1c] rounded-[16px] border border-[#ebebea] dark:border-[#222222] text-center">
                              <span className="text-[8.5px] font-mono text-[#a0a09a] block uppercase">Cognitive Status</span>
                              <span className={`text-[12px] font-mono font-bold uppercase ${node.struggle ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>
                                {node.struggle ? 'Needs Review' : 'Proficient'}
                              </span>
                            </div>
                          </div>

                          {/* Concept Description Notes */}
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-mono text-[#a0a09a] uppercase block">Concept Summary notes</span>
                            <p className="text-[12px] text-[#5a5a55] dark:text-[#a0a09a] leading-relaxed font-sans bg-[#f5f5f3]/40 dark:bg-[#1c1c1c]/30 p-4 rounded-[16px] border border-[#ebebea]/40 dark:border-[#222222]/40">
                              {desc}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 flex flex-col gap-2">
                            <button 
                              onClick={() => {
                                const queryText = `Can you explain the details and equations related to "${node.label}" from my sessions?`;
                                onAskMentor && onAskMentor(queryText);
                                setSelectedNode(null);
                              }}
                              className="w-full bg-[#080808] dark:bg-[#f5f5f3] text-white dark:text-[#080808] rounded-full py-3 text-[11px] font-mono font-semibold hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                            >
                              <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
                              Deep-Dive with AI Mentor
                            </button>
                            <button 
                              onClick={() => setSelectedNode(null)}
                              className="w-full bg-[#f5f5f3] dark:bg-[#1c1c1c] text-[#5a5a55] dark:text-[#a0a09a] hover:text-[#080808] dark:hover:text-[#f5f5f3] rounded-full py-3 text-[11px] font-mono font-medium transition-all active:scale-95 text-center"
                            >
                              Back to Graph
                            </button>
                          </div>

                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          )}

          {/* TAB 3: LEARNING PATHS (Split grids) */}
          {activeTab === 'paths' && (
            <div className="space-y-4">
              <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase tracking-widest block">Curriculums Paths</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {knowledgeModel.learningPath.map((path) => (
                  <div key={path.id} className="p-5 bg-white border border-[#e8e8e4] rounded-[24px] space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-[14px] font-semibold text-[#080808]">{path.title}</h3>
                        <p className="text-[11px] text-[#5a5a55] leading-normal font-mono mt-1">{path.description}</p>
                      </div>

                      {/* Modules Checklist */}
                      <div className="border-t border-[#f0f0ee] pt-4 space-y-2.5">
                        {path.modules.map((mod, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[12px]">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${mod.completed ? 'border-[#22c55e] bg-[#22c55e]/10' : 'border-[#e4e4e0]'}`}>
                                {mod.completed && <CheckCircle className="w-2.5 h-2.5 stroke-[#22c55e]" strokeWidth={2} />}
                              </div>
                              <span className={mod.completed ? 'text-[#a0a09a] line-through font-normal' : 'text-[#080808] font-medium'}>
                                {mod.completed ? mod.name : mod.name}
                              </span>
                            </div>
                            <span className="text-[9px] font-mono text-[#a0a09a]">
                              {mod.completed ? 'Complete' : 'Pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button className="w-full bg-[#f5f5f3] hover:bg-[#ebebea] text-[#080808] rounded-full py-2.5 text-[11px] font-mono font-medium transition-all flex items-center justify-center gap-1.5 active:scale-95 mt-4">
                      Start Next Learning Segment
                      <ChevronRight className="w-3.5 h-3.5 stroke-[#080808]" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CO-OP PEER SYNC */}
          {activeTab === 'sync' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase tracking-widest block">Collaborative Study Synergy</span>
                  <h3 className="text-[15px] font-semibold text-[#080808]">Cooperative Knowledge Graph Merger</h3>
                </div>
                
                {/* Selector */}
                <div className="flex items-center gap-2 text-[11px] font-mono bg-white p-1.5 border border-[#e4e4e0] rounded-full">
                  <span className="text-[#a0a09a] pl-2">Sync Peer:</span>
                  <select
                    value={selectedPeer}
                    onChange={(e) => setSelectedPeer(e.target.value)}
                    className="bg-transparent border-none outline-none text-[#080808] pr-2 font-semibold"
                  >
                    <option value="aria">Aria Chen (Software/SaaS)</option>
                    <option value="leo">Leo Vance (Physics/Mechanics)</option>
                    <option value="maya">Maya Patel (Business/Launch)</option>
                  </select>
                </div>
              </div>

              {/* Venn diagram representation & recommendations */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* SVG Graph Merge (Venn Diagram Style Nodes) */}
                <div className="lg:col-span-8 bg-white border border-[#e8e8e4] rounded-[24px] p-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[350px]">
                  <span className="text-[8.5px] font-mono text-[#a0a09a] uppercase absolute top-4 left-6">Synergy Topology Map</span>
                  
                  {/* Legend */}
                  <div className="absolute top-4 right-6 flex gap-3 text-[8px] font-mono">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e]"></div>
                      <span>Shared Mastery</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                      <span>Your Strength</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                      <span>Their Strength</span>
                    </div>
                  </div>

                  {/* SVG Map */}
                  <svg className="w-full max-w-[500px] h-[260px] overflow-visible" viewBox="0 0 500 260">
                    {/* Circle overlays representing venn circles */}
                    <circle cx="180" cy="130" r="100" fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
                    <circle cx="320" cy="130" r="100" fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
                    
                    <text x="110" y="50" textAnchor="middle" fontSize="9" fill="#a0a09a" fontFamily="mono">YOUR PROFILE</text>
                    <text x="390" y="50" textAnchor="middle" fontSize="9" fill="#a0a09a" fontFamily="mono">{currentPeer.fullName.toUpperCase()}'S PROFILE</text>

                    {/* Nodes representing comparative concepts */}
                    {/* Left: Your Strengths */}
                    {currentPeer.yourStrengths.map((node, idx) => (
                      <g key={`yours-${idx}`} transform={`translate(${node.x}, ${node.y})`} className="cursor-pointer" onClick={() => handleTopicClick(node.name)}>
                        <circle cx="0" cy="0" r="6" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
                        <text x="0" y={idx === 1 ? 18 : -12} textAnchor="middle" fontSize="9" fontWeight="medium" fill="#080808" className="dark:fill-[#f5f5f3]" fontFamily="mono">{node.name}</text>
                      </g>
                    ))}

                    {/* Middle: Shared Mastery */}
                    {currentPeer.sharedMastery.map((node, idx) => (
                      <g key={`shared-${idx}`} transform={`translate(${node.x}, ${node.y})`} className="cursor-pointer" onClick={() => handleTopicClick(node.name)}>
                        <circle cx="0" cy="0" r="6" fill="#22c55e" stroke="white" strokeWidth="1.5" />
                        <text x="0" y={idx === 1 ? 18 : -12} textAnchor="middle" fontSize="9" fontWeight="medium" fill="#080808" className="dark:fill-[#f5f5f3]" fontFamily="mono">{node.name}</text>
                      </g>
                    ))}

                    {/* Right: Peer Strengths */}
                    {currentPeer.peerStrengths.map((node, idx) => (
                      <g key={`peer-${idx}`} transform={`translate(${node.x}, ${node.y})`} className="cursor-pointer" onClick={() => handleTopicClick(node.name)}>
                        <circle cx="0" cy="0" r="6" fill="#f59e0b" stroke="white" strokeWidth="1.5" />
                        <text x="0" y={idx === 1 ? 18 : -12} textAnchor="middle" fontSize="9" fontWeight="medium" fill="#080808" className="dark:fill-[#f5f5f3]" fontFamily="mono">{node.name}</text>
                      </g>
                    ))}
                  </svg>
                </div>

                {/* Recommendations checklist (takes 4 cols) */}
                <div className="lg:col-span-4 space-y-4">
                  <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase tracking-widest block">Co-op Study Synergy recommendations</span>
                  
                  <div className="bg-white border border-[#e8e8e4] rounded-[24px] p-5 space-y-4">
                    <div className="space-y-1">
                      <span className="text-[8px] font-mono text-[#a0a09a] block uppercase">Knowledge Gap Analysis</span>
                      <h4 className="text-[12px] font-semibold text-[#080808]">Mentor / Mentee Matching</h4>
                    </div>

                    <div className="space-y-3.5 border-t border-[#f0f0ee] pt-4 text-[11px] font-mono">
                      <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-[14px] space-y-1">
                        <span className="text-[8.5px] font-bold text-blue-500 uppercase">You Can Mentor:</span>
                        <p className="text-[#5a5a55] dark:text-[#a0a09a] leading-normal">
                          {renderBoldText(currentPeer.mentorText)}
                        </p>
                      </div>

                      <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-[14px] space-y-1">
                        <span className="text-[8.5px] font-bold text-amber-500 uppercase">Peer Can Mentor You:</span>
                        <p className="text-[#5a5a55] dark:text-[#a0a09a] leading-normal">
                          {renderBoldText(currentPeer.menteeText)}
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={() => alert("Sync link copied! Send it to your peer to merge graphs.")}
                      className="w-full bg-[#080808] dark:bg-[#f5f5f3] text-white dark:text-[#080808] rounded-full py-2.5 text-[10px] font-mono font-medium hover:opacity-90 transition-all active:scale-95 text-center block"
                    >
                      Export Sync Token Link
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
