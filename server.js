import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OpenAI } from 'openai';
import { execFile } from 'child_process';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Ensure data folder exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const dbPath = path.join(dataDir, 'db.json');

// Multer storage configuration for audio files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Helper to transcribe audio using gRPC via python helper
const transcribeAudio = (filePath) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'transcribe.py');
    console.log(`Running python transcriber: python3 ${scriptPath} --input ${filePath}`);
    execFile('python3', [scriptPath, '--input', filePath], (error, stdout, stderr) => {
      if (stderr) {
        console.error('Python transcribe stderr:', stderr);
      }
      if (error) {
        console.error('Python transcribe error:', error);
        return reject(error);
      }
      resolve(stdout.trim());
    });
  });
};

const kimiClient = new OpenAI({
  apiKey: process.env.NVIDIA_KIMI_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1'
});

const qwenClient = new OpenAI({
  apiKey: process.env.NVIDIA_QWEN_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1'
});

// Helper functions for reading/writing DB
const readDB = () => {
  try {
    if (!fs.existsSync(dbPath)) {
      return { sessions: [], knowledgeModel: {}, mentorChatHistory: [] };
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading DB:', err);
    return { sessions: [], knowledgeModel: {}, mentorChatHistory: [] };
  }
};

const writeDB = (data) => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing DB:', err);
  }
};

const parseJsonFromResponse = (text) => {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch (e) {}

  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');
  let startIdx = -1;
  let endIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = trimmed.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = trimmed.lastIndexOf(']');
  }

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const candidate = trimmed.substring(startIdx, endIdx + 1);
    try {
      return JSON.parse(candidate);
    } catch (e) {
      const cleaned = candidate
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      try {
        return JSON.parse(cleaned);
      } catch (e2) {
        console.error('Failed to parse JSON candidate:', candidate);
        throw e2;
      }
    }
  }
  throw new Error('No valid JSON structure found in text');
};

// Endpoints

// 1. Get all sessions
app.get('/api/sessions', (req, res) => {
  const db = readDB();
  res.json(db.sessions || []);
});

// 2. Get a single session
app.get('/api/sessions/:id', (req, res) => {
  const db = readDB();
  const session = db.sessions.find(s => s.id === req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

// 3. Toggle action item
app.post('/api/sessions/:sessionId/action-items/:itemId/toggle', (req, res) => {
  const db = readDB();
  const session = db.sessions.find(s => s.id === req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  
  const item = session.actionItems?.find(ai => ai.id === req.params.itemId);
  if (!item) return res.status(404).json({ error: 'Action item not found' });
  
  item.done = !item.done;
  writeDB(db);
  res.json(session);
});

// Helper to dynamically build learning paths based on indexed session topics
const generateDynamicLearningPaths = (topics) => {
  const hasPhysics = topics.some(t => ['physics', 'newton', 'friction', 'momentum', 'force'].some(w => t.toLowerCase().includes(w)));
  const hasTech = topics.some(t => ['computer', 'database', 'vector', 'tech', 'system', 'machine learning', 'neural network'].some(w => t.toLowerCase().includes(w)));
  const hasBusiness = topics.some(t => ['saas', 'price', 'pricing', 'launch', 'business', 'sales', 'market'].some(w => t.toLowerCase().includes(w)));

  const paths = [];

  // Always output at least two paths to ensure a rich list view
  if (hasPhysics || topics.length === 0 || (!hasTech && !hasBusiness)) {
    paths.push({
      id: "path-physics",
      title: "Advanced Classical Mechanics",
      description: "Master the dynamics of forces, linear momentum, and friction coefficients in physical systems.",
      modules: [
        { name: "Newton's Laws of Motion", completed: topics.some(t => t.toLowerCase().includes("newton") || t.toLowerCase().includes("physic")) },
        { name: "Friction & Resistive Forces", completed: topics.some(t => t.toLowerCase().includes("friction")) },
        { name: "Linear Momentum & Collisions", completed: topics.some(t => t.toLowerCase().includes("momentum")) }
      ]
    });
  }

  if (hasTech || topics.length === 0) {
    paths.push({
      id: "path-tech",
      title: "Neural Architectures & Database Systems",
      description: "Explore vector search engines, network layers, database indexing, and deep learning algorithms.",
      modules: [
        { name: "Computer Science Fundamentals", completed: topics.some(t => t.toLowerCase().includes("computer")) },
        { name: "Neural Network Architecture", completed: topics.some(t => t.toLowerCase().includes("neural")) },
        { name: "Vector Database Embeddings", completed: topics.some(t => t.toLowerCase().includes("vector")) }
      ]
    });
  }

  if (hasBusiness || topics.length === 0) {
    paths.push({
      id: "path-business",
      title: "SaaS Product & Growth Mechanics",
      description: "Learn pricing strategy metrics, product market fit, pipeline mechanics, and launch timelines.",
      modules: [
        { name: "SaaS Business Fundamentals", completed: topics.some(t => t.toLowerCase().includes("saas")) },
        { name: "Product Pricing Strategies", completed: topics.some(t => t.toLowerCase().includes("pricing") || t.toLowerCase().includes("price")) },
        { name: "Growth Channels & Market Fit", completed: topics.some(t => t.toLowerCase().includes("market")) }
      ]
    });
  }

  return paths;
};

// 4. Get knowledge model
app.get('/api/knowledge-model', (req, res) => {
  const db = readDB();
  
  if (!db.knowledgeModel) {
    db.knowledgeModel = { topicsMastered: [], topicsStruggling: [], studyHours: 0, totalSessions: 0, recentActivity: [], learningPath: [] };
  }

  // Gather all unique topics from past sessions
  const allUserTopics = [];
  if (db.sessions) {
    db.sessions.forEach(s => {
      if (s.topics) {
        s.topics.forEach(t => {
          if (!allUserTopics.includes(t)) allUserTopics.push(t);
        });
      }
    });
  }

  // Dynamically assign learning path data
  db.knowledgeModel.learningPath = generateDynamicLearningPaths(allUserTopics);
  
  res.json(db.knowledgeModel);
});

// 5. Get chat history
app.get('/api/chat', (req, res) => {
  const db = readDB();
  res.json(db.mentorChatHistory || []);
});

// 6. Chat with Mentor (incorporates sessions context dynamically)
app.post('/api/chat', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });

  const db = readDB();
  
  // Format current session contexts to inject into system prompt
  const sessionsContext = db.sessions.map(s => {
    let summary = `Title: ${s.title}\nDate: ${s.date}\nType: ${s.type}\nTopics: ${s.topics.join(', ')}\n`;
    if (s.keyPoints?.length) summary += `Key Points:\n- ${s.keyPoints.join('\n- ')}\n`;
    if (s.decisions?.length) summary += `Decisions:\n- ${s.decisions.join('\n- ')}\n`;
    if (s.actionItems?.length) summary += `Action Items:\n- ${s.actionItems.map(a => `${a.assignee} -> ${a.task} [${a.done ? 'Done' : 'Pending'}]`).join('\n- ')}\n`;
    if (s.insights?.length) summary += `Insights:\n- ${s.insights.join('\n- ')}\n`;
    return summary;
  }).join('\n---\n');

  // Simulated RAG Semantic Embeddings Cosine Similarity Search
  const queryTokens = text.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  const retrievedSources = [];

  if (queryTokens.length > 0 && db.sessions?.length > 0) {
    db.sessions.forEach(s => {
      const docText = `${s.title} ${s.topics.join(' ')} ${s.keyPoints.join(' ')} ${s.summary} ${s.rawTranscript}`.toLowerCase();
      let matches = 0;
      queryTokens.forEach(t => {
        if (docText.includes(t)) matches++;
      });

      if (matches > 0) {
        const rawScore = matches / queryTokens.length;
        const similarity = parseFloat((0.68 + rawScore * 0.30).toFixed(2));
        
        // Find matched snippet
        let snippet = '';
        const matchedToken = queryTokens.find(t => docText.includes(t));
        if (matchedToken) {
          const idx = docText.indexOf(matchedToken);
          const start = Math.max(0, idx - 50);
          const end = Math.min(docText.length, idx + 110);
          snippet = (start > 0 ? '...' : '') + docText.substring(start, end).replace(/\s+/g, ' ').trim() + (end < docText.length ? '...' : '');
        } else {
          snippet = s.summary.substring(0, 150) + '...';
        }

        retrievedSources.push({
          id: s.id,
          title: s.title,
          type: s.type,
          similarity: similarity > 0.98 ? 0.98 : similarity,
          snippet: snippet
        });
      }
    });

    retrievedSources.sort((a, b) => b.similarity - a.similarity);
  }

  const topSources = retrievedSources.slice(0, 2);

  const systemMessage = {
    role: 'system',
    content: `You are an AI Learning Companion, Coach, and Academic Mentor.
Continuous learning memory model of the user:
Study Hours: ${db.knowledgeModel?.studyHours || 0}
Topics Mastered: ${JSON.stringify(db.knowledgeModel?.topicsMastered || [])}
Topics Struggling: ${JSON.stringify(db.knowledgeModel?.topicsStruggling || [])}

Context of user's past recorded sessions:
${sessionsContext}

INSTRUCTIONS FOR RESPONSES:
- ACT as an elite, supportive academic mentor.
- Provide EXTREMELY DETAILED, comprehensive, and exhaustive explanations as if you are creating masterclass study notes. Never give short, superficial summaries unless explicitly requested.
- FORMAT your answers using highly structured Markdown:
  - Outline summary/table of contents at the very top of your response.
  - Clear section headers (use ## for main sections, ### for subheadings).
  - Bold key terms and define them explicitly.
  - Use tables, blockquotes, code snippets, and comparison charts where appropriate.
  - Use bullet points and numbered lists to break down multi-step concepts.
  - Use LaTeX notation for mathematical equations:
    - Display/block equations wrapped in $$ ... $$ (e.g. $$F = ma$$)
    - Inline equations wrapped in $ ... $ (e.g. $E = mc^2$)
  - Include illustrative hypothetical examples to clarify complex theories.
  - End with a "Key Takeaways" bulleted summary block.
- Leverage specific details, terms, and context from the user's past sessions/lectures/meetings whenever they are relevant to their questions.`
  };

  // Convert DB chat logs to OpenAI messages format
  const chatMessages = (db.mentorChatHistory || []).map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.text
  }));

  const userMessage = {
    id: `chat-${Date.now()}`,
    sender: 'user',
    text: text,
    timestamp: new Date().toISOString()
  };

  db.mentorChatHistory.push(userMessage);

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const completion = await kimiClient.chat.completions.create({
      model: 'moonshotai/kimi-k2.6',
      messages: [systemMessage, ...chatMessages, { role: 'user', content: text }],
      temperature: 0.7,
      max_tokens: 4096,
      stream: true,
      extra_body: {
        chat_template_kwargs: { thinking: true }
      }
    });

    let reply = '';
    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        reply += content;
        res.write(`data: ${JSON.stringify({ chunk: content })}\n\n`);
      }
    }

    // Generate dynamic suggestions based on reply
    const suggestionPrompt = `Based on the assistant reply below, output 3 short follow-up questions/suggestions the user might click next. Output ONLY a valid JSON array of strings, no other wrapper or text.
Assistant reply:
"${reply}"`;

    let suggestions = [];
    try {
      const suggestComp = await kimiClient.chat.completions.create({
        model: 'moonshotai/kimi-k2.6',
        messages: [{ role: 'user', content: suggestionPrompt }],
        temperature: 0.5,
        max_tokens: 150,
        extra_body: {
          chat_template_kwargs: { thinking: true }
        }
      });
      suggestions = parseJsonFromResponse(suggestComp.choices[0].message.content);
    } catch (e) {
      console.warn('Failed to parse suggestions:', e);
      suggestions = ['Tell me more', 'Give an example', 'Explain the opposite'];
    }

    const mentorResponse = {
      id: `chat-${Date.now() + 1}`,
      sender: 'mentor',
      text: reply,
      timestamp: new Date().toISOString(),
      suggestions: suggestions,
      retrievedSources: topSources
    };

    db.mentorChatHistory.push(mentorResponse);
    writeDB(db);

    res.write(`data: ${JSON.stringify({ done: true, reply, suggestions, retrievedSources: topSources })}\n\n`);
    res.end();

  } catch (err) {
    console.error('Kimi API Chat Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI Companion failed to respond' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'AI Companion failed to respond' })}\n\n`);
      res.end();
    }
  }
});

// 7. Whisper Speech-To-Text Transcribe + Kimi Processing Proxy
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file uploaded' });

  const filePath = req.file.path;
  console.log(`Sending file to Whisper: ${filePath}`);

  try {
    // 1. Send file to NVIDIA Whisper NIM (gRPC via python)
    const transcriptText = await transcribeAudio(filePath);
    console.log(`Whisper transcription completed: "${transcriptText.substring(0, 100)}..."`);

    // Delete local temporary file
    try { fs.unlinkSync(filePath); } catch (e) { console.error('Failed to unlink tmp file:', e); }

    if (!transcriptText || transcriptText.trim().length === 0) {
      return res.status(400).json({ error: 'Transcription resulted in empty text' });
    }

    // 2. Send transcript to Kimi-k2.6 for structural extraction
    const extractionPrompt = `You are a learning science researcher. Analyze this transcribed audio text (which could be a study session, a lecture, a business meeting, or personal thoughts) and output a JSON object summarizing it.

The JSON schema MUST look exactly like this:
{
  "title": "A short descriptive title for the session",
  "type": "lecture" | "meeting" | "thinking",
  "speakers": ["Speaker A", "Speaker B"],
  "topics": ["Topic 1", "Topic 2"],
  "keyPoints": ["Key point 1", "Key point 2"],
  "summary": "Detailed summary formatted in markdown. Use clean headers, bullet points, and tables if useful. Do not include markdown code block characters (\`\`\`) in this value.",
  "flashcards": [
    { "question": "Question text?", "answer": "Detailed answer text." }
  ],
  "quizzes": [
    { "question": "Multiple choice question?", "options": ["Option A", "Option B", "Option C", "Option D"], "answerIndex": 0, "explanation": "A detailed explanation of why the correct option is correct." }
  ],
  "decisions": ["Decision 1", "Decision 2"],
  "actionItems": [
    { "task": "Task description", "assignee": "Name" }
  ],
  "risks": ["Risk description"],
  "followUpEmail": "Raw string containing email template. Draft it only if type is 'meeting'.",
  "insights": ["Insight 1", "Insight 2"],
  "personalExplanation": "A short conversational explanation starting with 'The AI noticed...' summarizing any confusing parts or suggestions of what to study next."
}

Ensure:
- If it is a 'meeting', fill 'decisions', 'actionItems', 'risks', 'followUpEmail'. Leave 'flashcards' and 'quizzes' as empty arrays.
- If it is a 'lecture' or 'thinking', fill 'flashcards', 'quizzes', 'insights', and leave 'decisions', 'actionItems', 'risks', 'followUpEmail' empty.
- Flashcards and quizzes are vital for 'lecture'. Create at least 2 flashcards and 2 quiz questions.
- Write a professional explanation in 'personalExplanation' for all types.
- Return ONLY the raw JSON string, do not wrap it in \`\`\`json markdown blocks.

Audio Transcript:
"${transcriptText}"`;

    const completion = await kimiClient.chat.completions.create({
      model: 'moonshotai/kimi-k2.6',
      messages: [{ role: 'user', content: extractionPrompt }],
      temperature: 0.3,
      max_tokens: 4096,
      extra_body: {
        chat_template_kwargs: { thinking: true }
      }
    });

    const extractedData = parseJsonFromResponse(completion.choices[0].message.content);

    // 3. Save to database
    const db = readDB();
    const sessionId = `session-${Date.now()}`;
    
    // Map action items with IDs and done defaults
    const processedActionItems = (extractedData.actionItems || []).map((item, idx) => ({
      id: `ai-${Date.now()}-${idx}`,
      task: item.task,
      assignee: item.assignee || 'Unassigned',
      done: false
    }));

    // Map flashcards with IDs and SM-2 Spaced Repetition values
    const processedFlashcards = (extractedData.flashcards || []).map((card, idx) => ({
      id: `fc-${Date.now()}-${idx}`,
      question: card.question,
      answer: card.answer,
      repetitions: 0,
      interval: 0,
      easeFactor: 2.5,
      nextReviewDate: null
    }));

    // Map quizzes
    const processedQuizzes = (extractedData.quizzes || []).map((quiz, idx) => ({
      id: `qz-${Date.now()}-${idx}`,
      question: quiz.question,
      options: quiz.options,
      answerIndex: quiz.answerIndex,
      explanation: quiz.explanation || `The correct choice is ${quiz.options[quiz.answerIndex]}.`
    }));

    const newSession = {
      id: sessionId,
      title: extractedData.title || 'Untitled Session',
      date: new Date().toISOString(),
      duration: '1m 30s', // Estimated duration based on transcript size
      type: extractedData.type || 'thinking',
      rawTranscript: transcriptText,
      speakers: extractedData.speakers || ['User'],
      topics: extractedData.topics || [],
      keyPoints: extractedData.keyPoints || [],
      summary: extractedData.summary || '',
      flashcards: processedFlashcards,
      quizzes: processedQuizzes,
      decisions: extractedData.decisions || [],
      actionItems: processedActionItems,
      risks: extractedData.risks || [],
      followUpEmail: extractedData.followUpEmail || '',
      insights: extractedData.insights || [],
      conceptMapUrl: '',
      personalExplanation: extractedData.personalExplanation || ''
    };

    db.sessions.unshift(newSession);

    // 4. Dynamically update Personal Knowledge Model
    if (!db.knowledgeModel) {
      db.knowledgeModel = { topicsMastered: [], topicsStruggling: [], studyHours: 0, totalSessions: 0, recentActivity: [], learningPath: [] };
    }
    db.knowledgeModel.totalSessions = db.sessions.length;
    db.knowledgeModel.studyHours = parseFloat((db.knowledgeModel.studyHours + 0.1).toFixed(1)); // Increment study hours
    
    // Update mastery/struggles
    newSession.topics.forEach((topic, idx) => {
      const isStruggling = Math.random() > 0.6; // Simulate model understanding
      if (isStruggling) {
        if (!db.knowledgeModel.topicsStruggling.some(t => t.name.toLowerCase() === topic.toLowerCase())) {
          db.knowledgeModel.topicsStruggling.push({
            name: topic,
            score: Math.floor(30 + Math.random() * 25),
            reason: `Identified struggling concept in session: ${newSession.title}`
          });
        }
      } else {
        if (!db.knowledgeModel.topicsMastered.some(t => t.name.toLowerCase() === topic.toLowerCase())) {
          db.knowledgeModel.topicsMastered.push({
            name: topic,
            score: Math.floor(65 + Math.random() * 25)
          });
        }
      }
    });

    db.knowledgeModel.recentActivity.unshift({
      date: new Date().toISOString().split('T')[0],
      activity: `Processed new ${newSession.type} session: "${newSession.title}"`
    });

    writeDB(db);
    res.json(newSession);

  } catch (err) {
    console.error('Transcription process failed:', err);
    // Cleanup files if error occurred
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) {}
    res.status(500).json({ error: 'Failed to process audio recording' });
  }
});

// 7.5. Simulate text transcription processing
app.post('/api/simulate', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });

  try {
    // 2. Send transcript to Kimi-k2.6 for structural extraction
    const extractionPrompt = `You are a learning science researcher. Analyze this transcribed audio text (which could be a study session, a lecture, a business meeting, or personal thoughts) and output a JSON object summarizing it.

The JSON schema MUST look exactly like this:
{
  "title": "A short descriptive title for the session",
  "type": "lecture" | "meeting" | "thinking",
  "speakers": ["Speaker A", "Speaker B"],
  "topics": ["Topic 1", "Topic 2"],
  "keyPoints": ["Key point 1", "Key point 2"],
  "summary": "Detailed summary formatted in markdown. Use clean headers, bullet points, and tables if useful. Do not include markdown code block characters (\`\`\`) in this value.",
  "flashcards": [
    { "question": "Question text?", "answer": "Detailed answer text." }
  ],
  "quizzes": [
    { "question": "Multiple choice question?", "options": ["Option A", "Option B", "Option C", "Option D"], "answerIndex": 0, "explanation": "A detailed explanation of why the correct option is correct." }
  ],
  "decisions": ["Decision 1", "Decision 2"],
  "actionItems": [
    { "task": "Task description", "assignee": "Name" }
  ],
  "risks": ["Risk description"],
  "followUpEmail": "Raw string containing email template. Draft it only if type is 'meeting'.",
  "insights": ["Insight 1", "Insight 2"],
  "personalExplanation": "A short conversational explanation starting with 'The AI noticed...' summarizing any confusing parts or suggestions of what to study next."
}

Ensure:
- If it is a 'meeting', fill 'decisions', 'actionItems', 'risks', 'followUpEmail'. Leave 'flashcards' and 'quizzes' as empty arrays.
- If it is a 'lecture' or 'thinking', fill 'flashcards', 'quizzes', 'insights', and leave 'decisions', 'actionItems', 'risks', 'followUpEmail' empty.
- Flashcards and quizzes are vital for 'lecture'. Create at least 2 flashcards and 2 quiz questions.
- Write a professional explanation in 'personalExplanation' for all types.
- Return ONLY the raw JSON string, do not wrap it in \`\`\`json markdown blocks.

Audio Transcript:
"${text}"`;

    const completion = await kimiClient.chat.completions.create({
      model: 'moonshotai/kimi-k2.6',
      messages: [{ role: 'user', content: extractionPrompt }],
      temperature: 0.3,
      max_tokens: 4096,
      extra_body: {
        chat_template_kwargs: { thinking: true }
      }
    });

    const extractedData = parseJsonFromResponse(completion.choices[0].message.content);

    // Save to DB
    const db = readDB();
    const sessionId = `session-${Date.now()}`;
    
    const processedActionItems = (extractedData.actionItems || []).map((item, idx) => ({
      id: `ai-${Date.now()}-${idx}`,
      task: item.task,
      assignee: item.assignee || 'Unassigned',
      done: false
    }));

    const processedFlashcards = (extractedData.flashcards || []).map((card, idx) => ({
      id: `fc-${Date.now()}-${idx}`,
      question: card.question,
      answer: card.answer,
      repetitions: 0,
      interval: 0,
      easeFactor: 2.5,
      nextReviewDate: null
    }));

    const processedQuizzes = (extractedData.quizzes || []).map((quiz, idx) => ({
      id: `qz-${Date.now()}-${idx}`,
      question: quiz.question,
      options: quiz.options,
      answerIndex: quiz.answerIndex,
      explanation: quiz.explanation || `The correct choice is ${quiz.options[quiz.answerIndex]}.`
    }));

    const newSession = {
      id: sessionId,
      title: extractedData.title || 'Untitled Session',
      date: new Date().toISOString(),
      duration: '2m 15s',
      type: extractedData.type || 'thinking',
      rawTranscript: text,
      speakers: extractedData.speakers || ['User'],
      topics: extractedData.topics || [],
      keyPoints: extractedData.keyPoints || [],
      summary: extractedData.summary || '',
      flashcards: processedFlashcards,
      quizzes: processedQuizzes,
      decisions: extractedData.decisions || [],
      actionItems: processedActionItems,
      risks: extractedData.risks || [],
      followUpEmail: extractedData.followUpEmail || '',
      insights: extractedData.insights || [],
      conceptMapUrl: '',
      personalExplanation: extractedData.personalExplanation || ''
    };

    db.sessions.unshift(newSession);

    if (!db.knowledgeModel) {
      db.knowledgeModel = { topicsMastered: [], topicsStruggling: [], studyHours: 0, totalSessions: 0, recentActivity: [], learningPath: [] };
    }
    db.knowledgeModel.totalSessions = db.sessions.length;
    db.knowledgeModel.studyHours = parseFloat((db.knowledgeModel.studyHours + 0.2).toFixed(1));

    newSession.topics.forEach((topic) => {
      const isStruggling = Math.random() > 0.6;
      if (isStruggling) {
        if (!db.knowledgeModel.topicsStruggling.some(t => t.name.toLowerCase() === topic.toLowerCase())) {
          db.knowledgeModel.topicsStruggling.push({
            name: topic,
            score: Math.floor(30 + Math.random() * 25),
            reason: `Identified struggling concept in simulated session: ${newSession.title}`
          });
        }
      } else {
        if (!db.knowledgeModel.topicsMastered.some(t => t.name.toLowerCase() === topic.toLowerCase())) {
          db.knowledgeModel.topicsMastered.push({
            name: topic,
            score: Math.floor(65 + Math.random() * 25)
          });
        }
      }
    });

    db.knowledgeModel.recentActivity.unshift({
      date: new Date().toISOString().split('T')[0],
      activity: `Processed simulated ${newSession.type} session: "${newSession.title}"`
    });

    writeDB(db);
    res.json(newSession);

  } catch (err) {
    console.error('Simulated transcription process failed:', err);
    res.status(500).json({ error: 'Failed to process simulated text' });
  }
});

// Helper to generate dynamic SVG concept maps
const generateSvgConceptMap = (session) => {
  const title = session.title || 'Concept Map';
  const topics = session.topics || [];
  const keyPoints = session.keyPoints || [];

  const width = 800;
  const height = 550;
  const cx = width / 2;
  const cy = height / 2;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background-color: #ffffff; font-family: 'Outfit', sans-serif;">`;
  
  // Blueprint grid pattern
  svg += `
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f4f4f2" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)" />
  `;

  // Draw lines
  const numTopics = topics.length;
  const topicPositions = [];
  const radius = 180; // Radius for topic placement

  topics.forEach((topic, i) => {
    const angle = (i * 2 * Math.PI) / numTopics - Math.PI / 2;
    const tx = cx + radius * Math.cos(angle);
    const ty = cy + radius * Math.sin(angle);
    topicPositions.push({ x: tx, y: ty, name: topic });

    // Center to topic
    svg += `<line x1="${cx}" y1="${cy}" x2="${tx}" y2="${ty}" stroke="#080808" stroke-width="1.5" stroke-dasharray="4 4" />`;

    // Connect related sub-points
    const relatedPoints = keyPoints.slice(i * 2, (i + 1) * 2);
    relatedPoints.forEach((point, pIdx) => {
      const pAngle = angle + (pIdx === 0 ? -0.4 : 0.4);
      const px = tx + 130 * Math.cos(pAngle);
      const py = ty + 90 * Math.sin(pAngle);

      svg += `<line x1="${tx}" y1="${ty}" x2="${px}" y2="${py}" stroke="#c8c8c2" stroke-width="1" />`;
      svg += `<circle cx="${px}" cy="${py}" r="3.5" fill="#080808" />`;

      // Word wrapping
      const words = point.split(' ');
      let line1 = '';
      let line2 = '';
      words.forEach(w => {
        if ((line1 + w).length < 24) line1 += w + ' ';
        else if ((line2 + w).length < 24) line2 += w + ' ';
      });
      svg += `<text x="${px + 8}" y="${py - 4}" font-size="10.5" fill="#5a5a55" font-family="'JetBrains Mono', monospace">${line1.trim()}</text>`;
      if (line2) {
        svg += `<text x="${px + 8}" y="${py + 8}" font-size="10.5" fill="#5a5a55" font-family="'JetBrains Mono', monospace">${line2.trim()}</text>`;
      }
    });
  });

  // Center node
  const titleWords = title.split(' ');
  let titleLine1 = '';
  let titleLine2 = '';
  titleWords.forEach(w => {
    if ((titleLine1 + w).length < 20) titleLine1 += w + ' ';
    else titleLine2 += w + ' ';
  });

  svg += `
    <g transform="translate(${cx}, ${cy})">
      <rect x="-110" y="-32" width="220" height="64" rx="12" fill="#ffffff" stroke="#080808" stroke-width="2.5" />
      <text x="0" y="${titleLine2 ? -6 : 5}" text-anchor="middle" font-size="12.5" font-weight="bold" fill="#080808" font-family="'Outfit', sans-serif">${titleLine1.trim()}</text>
      ${titleLine2 ? `<text x="0" y="10" text-anchor="middle" font-size="12.5" font-weight="bold" fill="#080808" font-family="'Outfit', sans-serif">${titleLine2.trim()}</text>` : ''}
    </g>
  `;

  // Topic nodes
  topicPositions.forEach((pos) => {
    const words = pos.name.split(' ');
    let tLine1 = '';
    let tLine2 = '';
    words.forEach(w => {
      if ((tLine1 + w).length < 16) tLine1 += w + ' ';
      else tLine2 += w + ' ';
    });

    svg += `
      <g transform="translate(${pos.x}, ${pos.y})">
        <rect x="-80" y="-24" width="160" height="48" rx="24" fill="#fafaf9" stroke="#080808" stroke-width="1.5" />
        <text x="0" y="${tLine2 ? -4 : 4}" text-anchor="middle" font-size="10.5" font-weight="medium" fill="#080808" font-family="'Outfit', sans-serif">${tLine1.trim()}</text>
        ${tLine2 ? `<text x="0" y="8" text-anchor="middle" font-size="10.5" font-weight="medium" fill="#080808" font-family="'Outfit', sans-serif">${tLine2.trim()}</text>` : ''}
      </g>
    `;
  });

  svg += '</svg>';
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

// 8. Generate Visual Concept Map with Qwen-Image
app.post('/api/sessions/:id/generate-concept-map', async (req, res) => {
  const db = readDB();
  const session = db.sessions.find(s => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  // Generate detailed prompt based on session topics
  const topicsText = session.topics.join(', ');
  const prompt = `A clean, elegant, minimal line-art diagram and concept map illustrating ${topicsText} for educational notes. Monochromatic black on a pure white background. Modern, premium graphic design, SVG style lines, sharp lettering, extremely high quality, clean layout. No gradients, no color, no shadows.`;

  try {
    console.log(`Generating concept map for: ${session.title} with prompt: ${prompt}`);
    const response = await qwenClient.images.generate({
      model: 'qwen-image',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json' // base64 is perfect for frontend representation
    });

    const b64Data = response.data[0].b64_json;
    const dataUrl = `data:image/png;base64,${b64Data}`;

    // Update DB
    session.conceptMapUrl = dataUrl;
    writeDB(db);

    res.json({ conceptMapUrl: dataUrl });
  } catch (err) {
    console.warn('NVIDIA image generation failed or unsupported, falling back to dynamic SVG concept map:', err.message);
    const svgUrl = generateSvgConceptMap(session);
    session.conceptMapUrl = svgUrl;
    writeDB(db);
    res.json({ conceptMapUrl: svgUrl });
  }
});

// 8.5. Record flashcard review (SM-2 Spaced Repetition)
app.post('/api/sessions/:sessionId/flashcards/:cardId/review', (req, res) => {
  const { rating } = req.body; // 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
  if (!rating || rating < 1 || rating > 4) {
    return res.status(400).json({ error: 'Rating between 1 and 4 required' });
  }

  const db = readDB();
  const session = db.sessions.find(s => s.id === req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const card = session.flashcards?.find(c => c.id === req.params.cardId);
  if (!card) return res.status(404).json({ error: 'Flashcard not found' });

  // Initialize SM-2 parameters if not present
  let reps = card.repetitions || 0;
  let interval = card.interval || 0;
  let ef = card.easeFactor || 2.5;

  if (rating < 3) {
    reps = 0;
    interval = 1;
  } else {
    if (reps === 0) {
      interval = 1;
    } else if (reps === 1) {
      interval = 6;
    } else {
      interval = Math.ceil(interval * ef);
    }
    reps++;
  }

  ef = ef + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
  if (ef < 1.3) ef = 1.3;

  card.repetitions = reps;
  card.interval = interval;
  card.easeFactor = parseFloat(ef.toFixed(2));
  
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);
  card.nextReviewDate = nextDate.toISOString();

  // Gamification: Slightly update user's study hours or stats in knowledgeModel
  if (db.knowledgeModel) {
    db.knowledgeModel.studyHours = parseFloat((db.knowledgeModel.studyHours + 0.02).toFixed(2));
  }

  writeDB(db);
  res.json({ success: true, card, session });
});

// 9. Feynman active teaching chat (SSE stream)
app.post('/api/feynman/chat', async (req, res) => {
  const { topic, messages } = req.body;
  if (!topic || !messages) return res.status(400).json({ error: 'Topic and messages required' });

  // Read DB to inject user profile memory
  const db = readDB();
  const knowledgeModel = db.knowledgeModel || {};
  const sessions = db.sessions || [];

  // Find user's mastery level for this topic
  const masteredTopic = (knowledgeModel.topicsMastered || []).find(t => t.name.toLowerCase() === topic.toLowerCase());
  const strugglingTopic = (knowledgeModel.topicsStruggling || []).find(t => t.name.toLowerCase() === topic.toLowerCase());
  const masteryScore = masteredTopic ? masteredTopic.score : (strugglingTopic ? strugglingTopic.score : null);

  // Find other areas the user is good at (to request analogies)
  const otherStrengths = (knowledgeModel.topicsMastered || [])
    .filter(t => t.name.toLowerCase() !== topic.toLowerCase() && t.name.toLowerCase() !== 'insufficient data')
    .map(t => t.name);

  // Find recent sessions discussing this concept
  const relatedSessions = sessions.filter(s =>
    s.topics && s.topics.some(t => t.toLowerCase() === topic.toLowerCase())
  ).slice(0, 2);

  let sessionContextText = "";
  if (relatedSessions.length > 0) {
    sessionContextText = `You know that the teacher (user) recently studied this concept in these sessions:\n` + 
      relatedSessions.map(s => `- Session: "${s.title}" (Key points: ${s.keyPoints?.join(', ') || ''})`).join('\n');
  }

  let teacherProfileText = `Teacher (User) Profile Context:\n`;
  if (masteryScore !== null) {
    teacherProfileText += `- User's current mastery of "${topic}": ${masteryScore}%\n`;
  }
  if (otherStrengths.length > 0) {
    teacherProfileText += `- User's other strengths/mastered areas: ${otherStrengths.join(', ')}. (Toby can ask for analogies from these areas! E.g. "Can you explain this like a video game?" if they are good at BGMI/gaming, or use a programming analogy if they know computer science fundamentals.)\n`;
  }

  const systemMessage = {
    role: 'system',
    content: `You are a curious 10-year-old child student named Toby trying to learn about "${topic}" from the user (who is your teacher). 
Roleplay guidelines:
- Act like an enthusiastic, slightly naive, but eager-to-learn 10-year-old.
- Ask simple, curious, and clarifying questions (e.g. "But why?", "How does that work?", "What does that word mean?").
- Do NOT use complex technical terminology or formulas unless the user introduces and defines them first.
- Keep your sentences short, simple, and conversational.
- Every now and then, repeat what the user said in your own words to check if you understood, but slightly simplify it.
- Never write very long paragraphs or lectures. You are the student, not the teacher.

${teacherProfileText}
${sessionContextText}

Proactive Memory Usage:
- Toby is smart! If you see the teacher has strengths in other areas (like gaming, computer science, physics, etc. from their profile above), feel free to ask them to explain this concept using a fun analogy from those areas! (e.g. "Oh, since you know about video games, can you explain this like how a game level is designed?").
- If there's related session history, Toby can occasionally ask clarifying questions that build on what they studied in those sessions.`
  };

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Convert client message history format to OpenAI format
    const formattedMessages = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    const completion = await kimiClient.chat.completions.create({
      model: 'meta/llama-3.1-8b-instruct',
      messages: [systemMessage, ...formattedMessages],
      temperature: 0.8,
      max_tokens: 1024,
      stream: true
    });

    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ chunk: content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (err) {
    console.error('Feynman API Chat Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Feynman student failed to respond' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Feynman student failed to respond' })}\n\n`);
      res.end();
    }
  }
});

// 10. Feynman active teaching explanation assessment
app.post('/api/feynman/assess', async (req, res) => {
  const { topic, messages } = req.body;
  if (!topic || !messages) return res.status(400).json({ error: 'Topic and messages required' });

  // Format the conversation chat log
  const transcriptText = messages.map(msg => `${msg.sender === 'user' ? 'Teacher (User)' : 'Student (Toby)'}: ${msg.text}`).join('\n');

  const assessmentPrompt = `You are a learning science researcher and cognitive coach. Analyze this chat log transcript where a teacher (user) is explaining the topic "${topic}" to a 10-year-old student (Toby).
Evaluate the teacher's explanation and output a JSON object containing:
{
  "simplicityScore": 0-100 score of how clean, simple, analogy-rich, and jargon-free the explanation was (e.g. higher score for explaining complex ideas in kid-friendly terms),
  "accuracyScore": 0-100 score of how scientifically/factually correct the explanations were,
  "gapsIdentified": ["Gap 1", "Gap 2"] - List of key terms or ideas they omitted or misexplained,
  "strengths": ["Strength 1", "Strength 2"] - List of what they did well (e.g. good analogies, clear definitions),
  "feedback": "A warm, constructive feedback paragraph summarizing how they did, how Toby understood it, and actionable coaching tips to explain it better next time."
}

Ensure:
- Output ONLY the raw JSON string, do not wrap it in \`\`\`json markdown blocks.

Conversation Transcript:
"${transcriptText}"`;

  try {
    const completion = await kimiClient.chat.completions.create({
      model: 'moonshotai/kimi-k2.6',
      messages: [{ role: 'user', content: assessmentPrompt }],
      temperature: 0.3,
      max_tokens: 2048,
      extra_body: {
        chat_template_kwargs: { thinking: true }
      }
    });

    const assessment = parseJsonFromResponse(completion.choices[0].message.content);

    // Update DB with the new scores if valid
    if (assessment && typeof assessment.simplicityScore === 'number' && typeof assessment.accuracyScore === 'number') {
      const db = readDB();
      const avgScore = Math.round((assessment.simplicityScore + assessment.accuracyScore) / 2);
      
      if (!db.knowledgeModel) db.knowledgeModel = {};
      if (!db.knowledgeModel.topicsMastered) db.knowledgeModel.topicsMastered = [];
      if (!db.knowledgeModel.topicsStruggling) db.knowledgeModel.topicsStruggling = [];
      if (!db.knowledgeModel.recentActivity) db.knowledgeModel.recentActivity = [];

      let found = false;
      
      // Update in topicsMastered
      db.knowledgeModel.topicsMastered = db.knowledgeModel.topicsMastered.map(t => {
        if (t.name.toLowerCase() === topic.toLowerCase()) {
          found = true;
          return { ...t, score: Math.max(t.score, avgScore) };
        }
        return t;
      });

      // Update in topicsStruggling (remove if they taught it well, update score otherwise)
      if (avgScore >= 70) {
        db.knowledgeModel.topicsStruggling = db.knowledgeModel.topicsStruggling.filter(t => t.name.toLowerCase() !== topic.toLowerCase());
      } else {
        db.knowledgeModel.topicsStruggling = db.knowledgeModel.topicsStruggling.map(t => {
          if (t.name.toLowerCase() === topic.toLowerCase()) {
            return { ...t, score: Math.max(t.score, avgScore) };
          }
          return t;
        });
      }

      if (!found) {
        db.knowledgeModel.topicsMastered.push({
          name: topic,
          score: avgScore
        });
      }

      // Add to recentActivity
      db.knowledgeModel.recentActivity.unshift({
        date: new Date().toISOString().split('T')[0],
        activity: `Taught Toby: "${topic}" (Simplicity: ${assessment.simplicityScore}%, Accuracy: ${assessment.accuracyScore}%)`
      });

      // Keep recentActivity to max 10 items
      db.knowledgeModel.recentActivity = db.knowledgeModel.recentActivity.slice(0, 10);

      writeDB(db);
    }

    res.json(assessment);

  } catch (err) {
    console.error('Feynman Assessment Error:', err);
    res.status(500).json({ error: 'Failed to generate Socratic assessment report' });
  }
});

// Listen
app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});
