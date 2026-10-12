import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import VirtualInterviewer, { MinimalAvatarLoader } from './VirtualInterviewer';
import axios from 'axios';
import { AVATAR_OPTIONS, selectVoiceForAvatar } from './avatarOptions';

const Interview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWaving, setIsWaving] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [avatarPath, setAvatarPath] = useState(AVATAR_OPTIONS[0].value);
  const selectedAvatar = AVATAR_OPTIONS.find(option => option.value === avatarPath) || AVATAR_OPTIONS[0];
  const [candidateName, setCandidateName] = useState('');
  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [answers, setAnswers] = useState([]);
  const [answer, setAnswer] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);

  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);
  const avatarPickerRef = useRef(null);
  const isListeningRef = useRef(false);
  const startingTextRef = useRef('');
  const answerRef = useRef('');

  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  useEffect(() => {
    // Pre-trigger voice loading
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    const handleClickOutside = (e) => {
      if (avatarPickerRef.current && !avatarPickerRef.current.contains(e.target)) {
        setShowAvatarMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Timer countdown while interview is running
  useEffect(() => {
    if (!hasStarted || evaluation || secondsLeft <= 0) return undefined;
    const timer = window.setInterval(() => setSecondsLeft(prev => prev - 1), 1000);
    return () => window.clearInterval(timer);
  }, [hasStarted, evaluation, secondsLeft]);

  const time = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [secondsLeft]);

  const speakText = (text, onEnd, avatarOverride) => {
    window.speechSynthesis.cancel();
    if (!text) return;
    const activeAvatar = avatarOverride || selectedAvatar;
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    if (activeAvatar && activeAvatar.voiceConfig) {
      const chosenVoice = selectVoiceForAvatar(voices, activeAvatar.voiceConfig);
      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }
      utterance.pitch = activeAvatar.voiceConfig.pitch ?? 1.0;
      utterance.rate = activeAvatar.voiceConfig.rate ?? 0.92;
    } else {
      const englishVoices = voices.filter(v => v.lang.startsWith('en'));
      if (englishVoices.length > 0) {
        utterance.voice = englishVoices[0];
      }
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsWaving(false);
    };
    window.speechSynthesis.speak(utterance);
  };

  const handleAvatarChange = (option) => {
    setAvatarPath(option.value);
    setShowAvatarMenu(false);
    setIsWaving(true);
    const greeting = option.voiceConfig?.greeting || 'Hey! I am your AI interviewer.';
    speakText(greeting, () => setIsWaving(false), option);
  };

  const speakQuestion = (index) => {
    if (!questions[index]) return;
    speakText(questions[index].text);
    setHasStarted(true);
  };

  const handleRepeat = () => {
    speakQuestion(currentIndex);
  };

  const generateQuestions = async (event) => {
    event.preventDefault();
    if (!resume || !jobDescription.trim()) return;
    setError('');
    setIsGenerating(true);
    const formData = new FormData();
    formData.append('resume', resume);
    formData.append('job_description', jobDescription);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/generate-interview/', formData);
      setQuestions(response.data.questions);
      setSecondsLeft((response.data.questions.length || 15) * 120);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to generate questions. Check the backend and API key.');
    } finally {
      setIsGenerating(false);
    }
  };

  const startFirstQuestion = () => {
    setCurrentIndex(0);
    setAnswers([]);
    setEvaluation(null);
    setHasStarted(true);
    setIsWaving(true);
    const name = candidateName.trim() || 'there';
    speakText(`Hello ${name}, welcome to your AI interview! Let us begin with the first question.`, () => {
      setIsWaving(false);
      speakQuestion(0);
    });
  };

  const submitAnswer = async (event) => {
    if (event) event.preventDefault();
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    if (!answer.trim()) return;
    const nextAnswers = [...answers, answer.trim()];
    setAnswers(nextAnswers);
    setAnswer('');
    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      speakQuestion(nextIndex);
      return;
    }
    setIsEvaluating(true);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/evaluate-interview/', {
        questions: questions.map(question => ({ text: question.text, ideal_answer: question.ideal_answer })),
        answers: nextAnswers,
      });
      setEvaluation(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to evaluate the interview.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      submitAnswer();
    }
  };

  const toggleSpeechInput = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Brave.');
      return;
    }

    if (isListening) {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (err) {}
      }
      setIsListening(false);
      return;
    }

    setError('');

    // Pre-prompt microphone permission explicitly if supported
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (micErr) {
        setError('Microphone access was denied. Please allow microphone permissions in your browser URL bar.');
        return;
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Remember the text that was already in the input before speaking
      startingTextRef.current = answerRef.current;
      isListeningRef.current = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let sessionFinal = '';
        let sessionInterim = '';

        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            sessionFinal += transcript + ' ';
          } else {
            sessionInterim += transcript;
          }
        }

        const prefix = startingTextRef.current ? startingTextRef.current.trim() + ' ' : '';
        const currentSpoken = (sessionFinal + sessionInterim).trim();
        if (currentSpoken) {
          setAnswer((prefix + currentSpoken).trim());
        }
      };

      recognition.onerror = (e) => {
        if (e.error === 'no-speech') {
          // Normal pause during thought, do NOT kill speech recognition!
          return;
        }
        if (e.error === 'not-allowed') {
          setError('Microphone permission blocked. Please enable microphone access.');
        } else if (e.error === 'network') {
          setError('Speech network error. Please verify your internet connection.');
        } else if (e.error !== 'aborted') {
          console.warn('Speech recognition warning:', e.error);
        }
        isListeningRef.current = false;
        setIsListening(false);
      };

      recognition.onend = () => {
        // If the user hasn't explicitly stopped listening, keep session alive
        if (isListeningRef.current) {
          try {
            startingTextRef.current = answerRef.current;
            recognition.start();
            return;
          } catch (reErr) {}
        }
        isListeningRef.current = false;
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition start error:', err);
      isListeningRef.current = false;
      setIsListening(false);
    }
  };

  return (
    <div className="ai-interview-page">
      {/* 1. Fullscreen 3D Avatar View */}
      <VirtualInterviewer
        isSpeaking={isSpeaking}
        isWaving={isWaving}
        className="ai-fullscreen-canvas"
        avatarPath={selectedAvatar.value}
        avatarScale={selectedAvatar.scale}
        avatarOffset={selectedAvatar.offset}
      />

      {/* 2. Top HUD Bar */}
      <header className="ai-hud-bar">
        <div className="ai-hud-brand">
          <span className="ai-live-pill">
            <span className="ai-live-dot" />
            LIVE AI INTERVIEW
          </span>
          <h2 className="ai-hud-title">AI Technical Screening</h2>

          {/* Avatar Switcher Pill */}
          <div className="ai-avatar-picker-wrap" ref={avatarPickerRef}>
            <button
              type="button"
              className="ai-avatar-picker-btn"
              onClick={() => setShowAvatarMenu(prev => !prev)}
              title="Change 3D Avatar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="7" r="4" />
                <path d="M5.5 21a8.5 8.5 0 0 1 13 0" />
              </svg>
              <span>{selectedAvatar.label.replace(' interviewer', '').replace(' avatar', '')}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showAvatarMenu && (
              <div className="ai-avatar-dropdown">
                {AVATAR_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    className={avatarPath === option.value ? 'selected' : ''}
                    onClick={() => handleAvatarChange(option)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="ai-hud-status">
          {questions.length > 0 && (
            <div className="ai-hud-pill ai-progress-pill">
              Question <strong className="ai-accent-text">{currentIndex + 1}</strong> of {questions.length}
            </div>
          )}
          {hasStarted && (
            <div className={`ai-hud-pill ai-timer-pill ${secondsLeft < 300 ? 'timer-warning' : ''}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{time}</span>
            </div>
          )}
          <div className="ai-hud-pill ai-candidate-pill">
            <span>👤 {candidateName.trim() || 'Candidate'}</span>
          </div>
        </div>
      </header>

      {/* 3. Pre-interview Preparation Modal */}
      {!hasStarted && !evaluation && (
        <div className="ai-modal-backdrop">
          <div className="ai-modal-card">
            <div className="ai-modal-badge">
              <span className="ai-live-dot" />
              AI TECHNICAL PREPARATION
            </div>
            <h1 className="ai-modal-title">Prepare Your Interview</h1>
            <p className="ai-modal-desc">
              Upload your resume and paste the job description. The AI interviewer will analyze both and generate 15 customized screening questions.
            </p>

            <form className="ai-modal-form" onSubmit={generateQuestions}>
              <label>
                Your Full Name
                <input
                  value={candidateName}
                  onChange={event => setCandidateName(event.target.value)}
                  placeholder="e.g. Alex Morgan"
                  required
                />
              </label>

              <label>
                Resume (PDF / DOCX)
                <label className="ai-file-dropzone">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                  <span className="ai-file-name">{resume ? resume.name : 'Select or drop resume document'}</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={event => setResume(event.target.files[0] || null)}
                    style={{ display: 'none' }}
                  />
                </label>
              </label>

              <label>
                Target Job Description
                <textarea
                  value={jobDescription}
                  onChange={event => setJobDescription(event.target.value)}
                  placeholder="Paste role requirements, tech stack, and responsibilities..."
                  rows={4}
                  required
                />
              </label>

              <button
                className="ai-start-btn"
                type="submit"
                disabled={!resume || !jobDescription.trim() || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <div className="ai-btn-spinner" />
                    <span>Analyzing & Generating 15 Questions...</span>
                  </>
                ) : (
                  <>
                    <span>Generate AI Interview Questions</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {questions.length > 0 && (
              <div className="ai-ready-wrap">
                <div className="ai-ready-badge">
                  <span>✓ 15 Questions Ready for this Role</span>
                </div>
                <button
                  type="button"
                  className="ai-start-btn pulse-glow"
                  onClick={startFirstQuestion}
                >
                  <span>Begin AI Interview Now</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </button>
              </div>
            )}

            {error && <p className="ai-error-banner">{error}</p>}
          </div>
        </div>
      )}

      {/* 4. Active Interview - Subtitle Overlay & Response Dock */}
      {hasStarted && !evaluation && (
        <>
          {/* Subtitle Overlay with Live Speaking waves and Repeat audio button */}
          <div className="ai-subtitle-overlay">
            <div className="ai-subtitle-meta">
              <div className="ai-speaker-badge">
                <span className={`ai-speaker-indicator ${isSpeaking ? 'speaking' : ''}`}>
                  <span /><span /><span /><span />
                </span>
                <span>{isSpeaking ? 'AI Interviewer speaking...' : 'AI Interviewer'}</span>
              </div>
              <button
                type="button"
                className="ai-repeat-btn"
                onClick={handleRepeat}
                disabled={isSpeaking || isEvaluating}
                title="Listen to question again"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
                <span>Repeat Question</span>
              </button>
            </div>
            <div className="ai-subtitle-text">
              "{questions[currentIndex]?.text}"
            </div>
          </div>

          {/* Floating Response Dock */}
          <div className="ai-response-dock">
            <form className="ai-dock-form" onSubmit={submitAnswer}>
              <div className="ai-dock-input-wrap">
                <textarea
                  ref={textareaRef}
                  value={answer}
                  onChange={event => setAnswer(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your answer, or use 'Speak to type' to answer with your voice..."
                  rows={2}
                  disabled={isEvaluating}
                  required
                />
                {answer && (
                  <button
                    type="button"
                    className="ai-dock-clear-btn"
                    onClick={() => setAnswer('')}
                    title="Clear text"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="ai-dock-actions">
                <div className="ai-dock-left">
                  <button
                    type="button"
                    className={`ai-voice-btn ${isListening ? 'listening' : ''}`}
                    onClick={toggleSpeechInput}
                    disabled={isEvaluating}
                    title={isListening ? 'Click to stop listening' : 'Click to speak your answer'}
                  >
                    <span className="ai-mic-icon">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    </span>
                    <span>{isListening ? 'Listening... (Click to finish)' : 'Speak to type'}</span>
                    {isListening && (
                      <span className="ai-mic-pulse">
                        <span /><span /><span />
                      </span>
                    )}
                  </button>
                  <span className="ai-dock-tip">Tip: Press Ctrl + Enter to submit</span>
                </div>
                <div className="ai-dock-right">
                  <button
                    type="submit"
                    className="ai-submit-btn"
                    disabled={!answer.trim() || isEvaluating}
                  >
                    <span>
                      {isEvaluating
                        ? 'Evaluating answers...'
                        : currentIndex === questions.length - 1
                        ? 'Submit & See Results'
                        : 'Next Question'}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                </div>
              </div>
            </form>
            {error && <p className="ai-error-banner">{error}</p>}
          </div>
        </>
      )}

      {/* 5. Evaluation / Results Modal */}
      {evaluation && (
        <div className="ai-modal-backdrop">
          <div className="ai-modal-card ai-result-card" style={{ maxWidth: '680px', maxHeight: '88vh', overflowY: 'auto' }}>
            <div className="ai-modal-badge success">
              <span>✓ INTERVIEW COMPLETED</span>
            </div>
            <div className="ai-score-ring">
              <span className="ai-score-value">{evaluation.score}</span>
              <span className="ai-score-max">/ {evaluation.max_score}</span>
            </div>
            <h1 className="ai-modal-title">Performance Evaluation</h1>
            <div className="ai-summary-box">
              <p>{evaluation.summary}</p>
            </div>

            <div className="ai-eval-list">
              {evaluation.results?.map((res, idx) => (
                <div className="ai-eval-item" key={idx}>
                  <div className="ai-eval-header">
                    <strong>{idx + 1}. {res.question}</strong>
                    <span className="ai-score-pill">{res.score}/10</span>
                  </div>
                  <p className="ai-eval-feedback">{res.feedback}</p>
                </div>
              ))}
            </div>

            <div className="ai-eval-actions">
              <button
                type="button"
                className="ai-start-btn"
                onClick={() => {
                  setEvaluation(null);
                  setHasStarted(false);
                  setAnswers([]);
                  setCurrentIndex(0);
                }}
              >
                <span>Practice Another Interview</span>
              </button>
              <button
                type="button"
                className="ai-start-btn secondary"
                onClick={() => navigate('/')}
              >
                <span>Return to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Interview;
