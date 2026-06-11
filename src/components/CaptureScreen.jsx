import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Upload, Play, Check, AlertCircle, ArrowRight, FileAudio } from 'lucide-react';

const loadingMessages = [
  "Contacting transcription gateway...",
  "Transcribing voice recording with Whisper-v3 NIM...",
  "Reconstructing transcript stream layout...",
  "Parsing text simulation nodes...",
  "Extracting key points and vocabulary...",
  "Mapping relational concept graph coordinates...",
  "Synthesizing active recall flashcards...",
  "Generating dynamic practice quiz questions...",
  "Finalizing spaced repetition interval structures...",
  "Optimizing continuous learning memory sync..."
];

export default function CaptureScreen({ onSessionCreated, onViewSession, sessions }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [captureMode, setCaptureMode] = useState('voice'); // 'voice' | 'text'
  const [simulateText, setSimulateText] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let interval = null;
    if (isUploading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep(prev => (prev < loadingMessages.length - 1 ? prev + 1 : prev));
      }, 3000);
    } else {
      setLoadingStep(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isUploading]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Format time (mm:ss)
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Live recording commands
  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        stream.getTracks().forEach(track => track.stop()); // Stop mic
        uploadAudio(audioBlob, 'recording.wav');
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Mic access error:', err);
      setError('Microphone access denied. Please verify system permissions or upload an audio file instead.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Upload and process audio file (either recorded or uploaded from files)
  const uploadAudio = async (blob, filename) => {
    setIsUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('audio', blob, filename);

    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Server processing failed');
      }

      const session = await res.json();
      onSessionCreated(session);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to process audio transcript. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle local file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('audio/') && !file.name.endsWith('.mp3') && !file.name.endsWith('.m4a') && !file.name.endsWith('.wav') && !file.name.endsWith('.webm')) {
      setError('Please select a valid audio file (.wav, .mp3, .m4a, .webm).');
      return;
    }

    uploadAudio(file, file.name);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleSimulateText = async () => {
    if (!simulateText.trim()) return;
    setIsUploading(true);
    setError(null);
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: simulateText })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Text indexing failed');
      }
      const session = await res.json();
      setSimulateText('');
      onSessionCreated(session);
    } catch (err) {
      console.error('Simulation error:', err);
      setError(err.message || 'Failed to process text simulation. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f5f5f3] overflow-y-auto">
      
      {/* Top Banner Status */}
      <div className="px-6 pt-5 pb-2">
        <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase tracking-widest block mb-1">Status</span>
        <div className="flex items-center gap-1.5">
          <div className="w-[5px] h-[5px] rounded-full bg-[#22c55e] live-dot"></div>
          <span className="text-[10px] font-mono text-[#5a5a55]">AI Learning Companion Active & Listening</span>
        </div>
      </div>

      {/* Main Workspace (Centered layout) */}
      <div className="flex-1 px-6 pb-6 flex flex-col justify-between max-w-3xl mx-auto w-full">
        
        {/* Core Recorder Panel */}
        <div className="bg-white border border-[#e8e8e4] rounded-[24px] p-8 flex flex-col justify-center items-center text-center my-auto min-h-[380px] shadow-[0_1px_6px_rgba(8,8,8,0.02)]">
          <div className="flex border border-[#e4e4e0] rounded-full p-0.5 text-[9px] font-mono bg-[#f5f5f3] mb-6">
            <button
              onClick={() => !isRecording && !isUploading && setCaptureMode('voice')}
              disabled={isRecording || isUploading}
              className={`px-4 py-1.5 rounded-full text-center transition-all ${captureMode === 'voice' ? 'bg-[#080808] text-white dark:bg-[#f5f5f3] dark:text-[#080808]' : 'text-[#5a5a55] hover:text-[#080808] dark:text-[#a0a09a] dark:hover:text-[#f5f5f3]'} disabled:opacity-40`}
            >
              Voice Capture
            </button>
            <button
              onClick={() => !isRecording && !isUploading && setCaptureMode('text')}
              disabled={isRecording || isUploading}
              className={`px-4 py-1.5 rounded-full text-center transition-all ${captureMode === 'text' ? 'bg-[#080808] text-white dark:bg-[#f5f5f3] dark:text-[#080808]' : 'text-[#5a5a55] hover:text-[#080808] dark:text-[#a0a09a] dark:hover:text-[#f5f5f3]'} disabled:opacity-40`}
            >
              Text Simulation
            </button>
          </div>
          
          {captureMode === 'voice' ? (
            <>
              {/* Pulsing recorder button container */}
              <div className="relative w-44 h-44 flex justify-center items-center my-auto">
                {isRecording && (
                  <>
                    <div className="absolute inset-0 rounded-full border border-[#080808]/20 ring-pulse"></div>
                    <div className="absolute inset-4 rounded-full border border-[#080808]/15 ring-pulse" style={{ animationDelay: '1.2s' }}></div>
                    <div className="absolute inset-8 rounded-full border border-[#080808]/10 ring-pulse" style={{ animationDelay: '2.4s' }}></div>
                  </>
                )}

                {isUploading && (
                  <div className="absolute inset-0 rounded-full border border-[#e4e4e0] border-t-[#080808] animate-spin"></div>
                )}

                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isUploading}
                  className={`w-32 h-32 rounded-full flex flex-col justify-center items-center transition-all duration-200 border bg-white border-[#e8e8e4] active:scale-95 z-10 ${isRecording ? 'border-[#080808] bg-[#fafaf9]' : 'hover:border-[#a0a09a]'}`}
                >
                  {isRecording ? (
                    <>
                      <Square className="w-5 h-5 stroke-[#080808] mb-1.5" strokeWidth={1.5} />
                      <span className="text-[10px] font-mono text-[#080808] tracking-widest">{formatTime(recordingTime)}</span>
                    </>
                  ) : isUploading ? (
                    <div className="flex flex-col items-center px-3">
                      <span className="text-[11px] font-mono text-[#5a5a55] animate-pulse">Processing</span>
                      <span className="text-[8px] font-mono text-[#a0a09a] mt-0.5">Kimi-k2.6 Index</span>
                    </div>
                  ) : (
                    <>
                      <Mic className="w-6 h-6 stroke-[#5a5a55] mb-1.5" strokeWidth={1.5} />
                      <span className="text-[11px] font-medium text-[#080808]">Record Audio</span>
                      <span className="text-[8px] font-mono text-[#a0a09a] mt-0.5">Whisper-v3 NIM</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-[#5a5a55] mt-6 max-w-[320px] leading-relaxed">
                {isRecording ? 'Recording active. Tap the square button to stop and index your study or sync session.' : 
                 isUploading ? (
                   <span className="font-mono text-[10.5px] text-[#a0a09a] animate-pulse block">
                     [AURA STATUS] {loadingMessages[loadingStep]}
                   </span>
                 ) : 
                 'Record your voice stream, or upload an audio file to extract outline summaries, action checklists, and interactive flashcard blocks.'}
              </p>

              {/* Clean Local File Uploader */}
              {!isRecording && !isUploading && (
                <div className="mt-5">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="audio/*,.mp3,.m4a,.wav,.webm"
                    className="hidden"
                  />
                  <button
                    onClick={triggerFileSelect}
                    className="inline-flex items-center gap-2 border border-[#e4e4e0] rounded-full px-4 py-1.5 text-[11px] font-mono font-light text-[#5a5a55] hover:border-[#080808] hover:text-[#080808] bg-[#fafaf9] active:scale-95 transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Upload Audio File</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="w-full flex flex-col gap-4 my-auto">
              <textarea
                value={simulateText}
                onChange={(e) => setSimulateText(e.target.value)}
                placeholder="Type or paste study session transcripts, lecture texts, or business meetings notes... (e.g. 'Friction is a resistive force that opposes motion. The coefficient of static friction is usually larger than kinetic friction, F_s = mu_s * N...')"
                className="w-full h-36 border border-[#e8e8e4] rounded-[16px] p-4 text-[12.5px] text-[#080808] placeholder-[#c0c0bc] focus:border-[#a0a09a] transition-all resize-none bg-[#fafaf9]"
                disabled={isUploading}
              />
              <button
                onClick={handleSimulateText}
                disabled={isUploading || !simulateText.trim()}
                className="w-full bg-[#080808] text-white dark:bg-[#f5f5f3] dark:text-[#080808] rounded-full py-2.5 text-[11px] font-mono font-medium disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                {isUploading ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border border-white/30 border-t-white animate-spin"></div>
                    <span className="animate-pulse font-mono">[AURA STATUS] {loadingMessages[loadingStep]}</span>
                  </>
                ) : (
                  <span>Index Live Transcript</span>
                )}
              </button>
              <p className="text-[10px] text-[#a0a09a] font-mono leading-normal">
                Pasting text simulates live-captured transcripts, indexing them through Kimi-k2.6 to build summaries, flashcards, and concept maps instantly.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-white border border-[#ef4444]/20 rounded-[12px] flex items-start gap-2 max-w-[320px] text-left">
              <AlertCircle className="w-4 h-4 stroke-[#ef4444] shrink-0 mt-0.5" strokeWidth={1.5} />
              <span className="text-[10px] text-[#ef4444] font-mono leading-tight">{error}</span>
            </div>
          )}
        </div>

        {/* Bottom Recent list */}
        <div className="border border-[#e8e8e4] bg-white rounded-[24px] p-5 flex flex-col gap-3 mt-6 shadow-[0_1px_6px_rgba(8,8,8,0.02)]">
          <span className="text-[9px] font-mono font-light text-[#b0b0a8] uppercase tracking-widest block">Recent Logged Sessions</span>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sessions.slice(0, 4).map((session) => (
              <button
                key={session.id}
                onClick={() => onViewSession(session.id)}
                className="p-3 bg-[#f5f5f3] hover:bg-[#ebebea] rounded-[14px] flex justify-between items-center text-left transition-all active:scale-95"
              >
                <div className="truncate pr-2">
                  <span className="text-[12px] font-medium text-[#080808] block truncate">
                    {session.title}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[8px] font-mono uppercase bg-white border border-[#e4e4e0] px-1 py-0.2 rounded-full text-[#5a5a55]">
                      {session.type}
                    </span>
                    <span className="text-[9px] font-mono text-[#a0a09a]">{session.duration}</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 stroke-[#5a5a55] shrink-0" strokeWidth={1.5} />
              </button>
            ))}

            {sessions.length === 0 && (
              <div className="col-span-2 text-center py-6">
                <span className="text-[11px] font-mono text-[#a0a09a]">No sessions captured.</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
