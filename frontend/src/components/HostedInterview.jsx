import React, { useEffect, useMemo, useState, useRef } from 'react';
import axios from 'axios';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import VirtualInterviewer from './VirtualInterviewer';
import { AVATAR_OPTIONS, selectVoiceForAvatar } from './avatarOptions';

const API = 'http://127.0.0.1:8000/api';

const DURATION_PRESETS = [15, 30, 45, 60];
const QUESTION_TEMPLATES = [
  "Walk me through your background and your most impactful technical project.",
  "Describe a difficult technical bug you solved and how you diagnosed it.",
  "How do you design scalable, fault-tolerant web applications?",
  "How do you resolve architectural disagreements within an engineering team?"
];

const CreatorInterview = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(30);
  const [questions, setQuestions] = useState([{ text: '' }]);
  const [created, setCreated] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCandidate, setCopiedCandidate] = useState(false);
  const [copiedManage, setCopiedManage] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const candidateLink = created ? `${window.location.origin}/candidate/${created.token}` : '';
  const manageLink = created ? `${window.location.origin}/manage/${created.token}?owner_key=${created.owner_key}` : '';

  const copyCandidate = async () => {
    await navigator.clipboard.writeText(candidateLink);
    setCopiedCandidate(true);
    setTimeout(() => setCopiedCandidate(false), 2000);
  };

  const copyManage = async () => {
    await navigator.clipboard.writeText(manageLink);
    setCopiedManage(true);
    setTimeout(() => setCopiedManage(false), 2000);
  };

  const createInterview = async (event) => {
    event.preventDefault();
    setError('');
    const validQuestions = questions.filter(q => q.text.trim());
    if (validQuestions.length === 0) {
      setError('Please add at least one question.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API}/hosted-interviews/`, {
        title,
        duration_minutes: duration,
        questions: validQuestions
      });
      setCreated(response.data);
      setAttempts([]);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not create the interview session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateQuestion = (index, value) => {
    setQuestions(previous => previous.map((question, questionIndex) => (questionIndex === index ? { text: value } : question)));
  };

  const addQuestion = (text = '') => {
    setQuestions(prev => [...prev, { text }]);
  };

  const removeQuestion = (index) => {
    if (questions.length <= 1) return;
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const refreshAttempts = async () => {
    if (!created) return;
    setIsRefreshing(true);
    try {
      const response = await axios.get(`${API}/hosted-interviews/${created.token}/dashboard/?owner_key=${created.owner_key}`);
      setAttempts(response.data.attempts);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not load candidate progress.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshAttempts();
    if (!created) return undefined;
    const interval = window.setInterval(refreshAttempts, 8000);
    return () => window.clearInterval(interval);
  }, [created]);

  if (created) {
    return (
      <div className="creator-page">
        {/* Top bar back button */}
        <div className="creator-topbar">
          <button type="button" className="creator-back-btn" onClick={() => navigate('/')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back to Dashboard</span>
          </button>
        </div>

        <section className="creator-card share-card">
          <div className="creator-badge success">
            <span>✓ INTERVIEW CREATED & LIVE</span>
          </div>
          <h1 className="creator-title">{created.title}</h1>
          <p className="creator-subtitle">
            Your AI interview session is ready! Share the private link with your candidates. As they complete questions with the 3D avatar, results will update below in real-time.
          </p>

          <div className="link-boxes">
            <div className="link-box candidate-box">
              <div className="link-box-header">
                <span className="link-type-pill candidate">Candidate Interview Link</span>
                <span className="link-note">Share this with interview candidates</span>
              </div>
              <div className="link-row">
                <input readOnly value={candidateLink} onClick={e => e.target.select()} />
                <button type="button" className={`copy-btn ${copiedCandidate ? 'copied' : ''}`} onClick={copyCandidate}>
                  {copiedCandidate ? '✓ Copied' : 'Copy Link'}
                </button>
                <a href={candidateLink} target="_blank" rel="noreferrer" className="open-link-btn" title="Open candidate preview">
                  ↗
                </a>
              </div>
            </div>

            <div className="link-box manage-box">
              <div className="link-box-header">
                <span className="link-type-pill manage">Owner Dashboard Link</span>
                <span className="link-note">Keep private — allows live results monitoring</span>
              </div>
              <div className="link-row">
                <input readOnly value={manageLink} onClick={e => e.target.select()} />
                <button type="button" className={`copy-btn ${copiedManage ? 'copied' : ''}`} onClick={copyManage}>
                  {copiedManage ? '✓ Copied' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>

          <div className="creator-actions-row">
            <a className="creator-download-btn" href={`${API}/hosted-interviews/${created.token}/results.csv?owner_key=${created.owner_key}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download CSV Results</span>
            </a>
          </div>
        </section>

        {/* Live Candidates Table */}
        <section className="creator-card">
          <div className="section-heading">
            <div>
              <div className="creator-badge live">
                <span className="ai-live-dot" />
                <span>LIVE FEED</span>
              </div>
              <h2>Candidate Submissions</h2>
            </div>
            <button type="button" className={`refresh-btn ${isRefreshing ? 'refreshing' : ''}`} onClick={refreshAttempts}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>

          {attempts.length === 0 ? (
            <div className="empty-attempts">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 14 14" />
              </svg>
              <p>Waiting for candidates to join. When candidates start the interview, their progress will appear here.</p>
            </div>
          ) : (
            <div className="candidate-table">
              <div className="table-head">
                <span>Candidate</span>
                <span>Status</span>
                <span>Score</span>
                <span>AI Remarks</span>
              </div>
              {attempts.map(attempt => (
                <div className="table-row" key={attempt.id}>
                  <strong>{attempt.candidate_name}</strong>
                  <span>
                    <span className={`status-pill ${attempt.status === 'completed' ? 'completed' : 'in-progress'}`}>
                      {attempt.status === 'completed' ? '✓ Completed' : '● In Progress'}
                    </span>
                  </span>
                  <span className="score-text">
                    {attempt.score == null ? '-' : `${attempt.score} / ${attempt.max_score}`}
                  </span>
                  <span className="remarks-text">{attempt.remarks || 'In progress...'}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="creator-page">
      <div className="creator-topbar">
        <button type="button" className="creator-back-btn" onClick={() => navigate('/')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to Dashboard</span>
        </button>
      </div>

      <section className="creator-card">
        <div className="creator-badge studio">
          <span className="ai-live-dot" />
          <span>AI INTERVIEW CREATOR STUDIO</span>
        </div>
        <h1 className="creator-title">Host Your Custom Interview</h1>
        <p className="creator-subtitle">
          Write questions, set an interactive time limit, and generate a customized candidate link with real-time 3D AI interviewer avatar.
        </p>

        <form className="creator-form" onSubmit={createInterview}>
          <label>
            <span>Interview Title</span>
            <input
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="e.g. Senior Frontend Engineer Screening"
              required
            />
          </label>

          <label>
            <span>Time Limit</span>
            <div className="duration-picker-wrap">
              <input
                type="number"
                min="5"
                max="180"
                value={duration}
                onChange={event => setDuration(Number(event.target.value))}
                required
              />
              <span className="duration-unit">minutes</span>
              <div className="duration-preset-chips">
                {DURATION_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    className={`preset-chip ${duration === preset ? 'active' : ''}`}
                    onClick={() => setDuration(preset)}
                  >
                    {preset}m
                  </button>
                ))}
              </div>
            </div>
          </label>

          {/* Interactive Question Builder */}
          <div className="question-editor">
            <div className="section-heading">
              <div>
                <h2>Interview Questions</h2>
                <span className="question-count-badge">{questions.length} Questions</span>
              </div>
              <button
                type="button"
                className="add-question-btn"
                onClick={() => addQuestion('')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Add Question</span>
              </button>
            </div>

            {/* Quick Templates Bar */}
            <div className="question-templates-bar">
              <span className="templates-label">Quick Ideas:</span>
              <div className="templates-chips">
                {QUESTION_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="template-chip"
                    onClick={() => addQuestion(tmpl)}
                    title="Click to add this question"
                  >
                    + {tmpl.slice(0, 32)}...
                  </button>
                ))}
              </div>
            </div>

            <div className="question-list">
              {questions.map((question, index) => (
                <div className="question-item-card" key={index}>
                  <span className="question-num-pill">Q{index + 1}</span>
                  <input
                    value={question.text}
                    onChange={event => updateQuestion(index, event.target.value)}
                    placeholder={`Type question ${index + 1}...`}
                    required
                  />
                  {questions.length > 1 && (
                    <button
                      type="button"
                      className="question-remove-btn"
                      onClick={() => removeQuestion(index)}
                      title="Remove question"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            className="creator-submit-btn"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span>Generating AI Session Link...</span>
            ) : (
              <>
                <span>Create & Generate Candidate Link</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>
        </form>

        {error && <p className="creator-error-banner">{error}</p>}
      </section>
    </div>
  );
};

const CandidateInterview = () => {
  const { token } = useParams();
  const [interview, setInterview] = useState(null);
  const [candidate, setCandidate] = useState({ name: '', email: '' });
  const [attemptId, setAttemptId] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [answer, setAnswer] = useState('');
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWaving, setIsWaving] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');

  const [avatarPath, setAvatarPath] = useState(AVATAR_OPTIONS[0].value);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const selectedAvatar = AVATAR_OPTIONS.find(option => option.value === avatarPath) || AVATAR_OPTIONS[0];

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
    axios.get(`${API}/hosted-interviews/${token}/`)
      .then(response => setInterview(response.data))
      .catch(() => setError('This interview link is invalid or unavailable.'));
  }, [token]);

  useEffect(() => {
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
        try { recognitionRef.current.stop(); } catch (err) {}
      }
    };
  }, []);

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
      const englishVoices = voices.filter(item => item.lang.startsWith('en'));
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

  const repeatQuestion = () => {
    if (!interview || !interview.questions || !interview.questions[index]) return;
    speakText(interview.questions[index].text);
  };

  useEffect(() => {
    if (!attemptId || result || secondsLeft <= 0) return undefined;
    const timer = window.setInterval(() => setSecondsLeft(previous => previous - 1), 1000);
    return () => window.clearInterval(timer);
  }, [attemptId, result, secondsLeft]);

  useEffect(() => {
    if (attemptId && secondsLeft === 0 && !result) {
      submitAnswers(answers);
    }
  }, [secondsLeft]);

  const start = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const response = await axios.post(`${API}/hosted-interviews/${token}/start/`, {
        candidate_name: candidate.name,
        candidate_email: candidate.email
      });
      setAttemptId(response.data.attempt_id);
      setInterview(response.data);
      setSecondsLeft(response.data.duration_minutes * 60);
      setAnswers(new Array(response.data.questions.length).fill(''));
      setIsWaving(true);
      speakText(`Hello ${candidate.name}, welcome to your AI interview! Let us begin with the first question.`, () => {
        setIsWaving(false);
        if (response.data.questions && response.data.questions[0]) {
          speakText(response.data.questions[0].text);
        }
      });
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not start this interview.');
    }
  };

  const submitAnswers = async (finalAnswers) => {
    try {
      const response = await axios.post(`${API}/hosted-interviews/${token}/attempts/${attemptId}/complete/`, {
        answers: finalAnswers
      });
      setResult(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not submit your answers.');
    }
  };

  const submitAnswer = (event) => {
    if (event) event.preventDefault();
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    const trimmed = answer.trim();
    const nextAnswers = answers.map((value, answerIndex) => (answerIndex === index ? trimmed : value));
    setAnswers(nextAnswers);
    setAnswer('');
    if (index === interview.questions.length - 1) {
      submitAnswers(nextAnswers);
    } else {
      const nextIndex = index + 1;
      setIndex(nextIndex);
      if (interview.questions[nextIndex]) {
        speakText(interview.questions[nextIndex].text);
      }
    }
  };

  const handleKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      submitAnswer();
    }
  };

  const toggleSpeech = async () => {
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

  const time = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [secondsLeft]);

  // Screen 1: Loading state
  if (!interview) {
    return (
      <div className="ai-interview-page">
        <div className="ai-modal-backdrop">
          <div className="ai-modal-card loading">
            <div className="ai-spinner" />
            <p>{error || 'Connecting to AI Interview Session...'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Screen 2: Completion / Result state
  if (result) {
    return (
      <div className="ai-interview-page">
        <VirtualInterviewer
          className="ai-fullscreen-canvas"
          avatarPath={selectedAvatar.value}
          avatarScale={selectedAvatar.scale}
          avatarOffset={selectedAvatar.offset}
        />
        <div className="ai-modal-backdrop">
          <div className="ai-modal-card ai-result-card">
            <div className="ai-modal-badge success">
              <span>✓ INTERVIEW COMPLETED</span>
            </div>
            <div className="ai-score-ring">
              <span className="ai-score-value">{result.score ?? '-'}</span>
              <span className="ai-score-max">/ {result.max_score ?? 100}</span>
            </div>
            <h1 className="ai-modal-title">Evaluation Received</h1>
            <div className="ai-summary-box">
              <p>{result.summary || 'Your answers have been submitted and evaluated by the AI interviewer.'}</p>
            </div>
            <a href="/" className="ai-start-btn secondary">
              <span>Return to Dashboard</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Screen 3: Pre-interview Candidate Lobby
  if (!attemptId) {
    return (
      <div className="ai-interview-page">
        <VirtualInterviewer
          isSpeaking={isSpeaking}
          isWaving={isWaving}
          className="ai-fullscreen-canvas"
          avatarPath={selectedAvatar.value}
          avatarScale={selectedAvatar.scale}
          avatarOffset={selectedAvatar.offset}
        />
        <header className="ai-hud-bar" style={{ zIndex: 35 }}>
          <div className="ai-hud-brand">
            <span className="ai-live-pill">
              <span className="ai-live-dot" />
              INTERVIEW LOBBY
            </span>

            {/* Avatar Switcher Pill in Lobby */}
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
        </header>

        <div className="ai-modal-backdrop">
          <div className="ai-modal-card">
            <div className="ai-modal-badge">
              <span className="ai-live-dot" />
              AI TECHNICAL INTERVIEW
            </div>
            <h1 className="ai-modal-title">{interview.title}</h1>
            <p className="ai-modal-desc">
              You are about to start an AI-led interview. The avatar will speak each question aloud, and you can speak or type your answers.
            </p>
            <div className="ai-info-chips">
              <div className="ai-chip">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>{interview.duration_minutes} Minutes</span>
              </div>
              <div className="ai-chip">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span>{interview.questions.length} Questions</span>
              </div>
              <div className="ai-chip">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                <span>Voice & Text</span>
              </div>
            </div>
            <form className="ai-modal-form" onSubmit={start}>
              <label>
                Your Full Name
                <input
                  value={candidate.name}
                  onChange={event => setCandidate({ ...candidate, name: event.target.value })}
                  placeholder="e.g. Alex Morgan"
                  required
                  autoFocus
                />
              </label>
              <label>
                Email Address (Optional)
                <input
                  type="email"
                  value={candidate.email}
                  onChange={event => setCandidate({ ...candidate, email: event.target.value })}
                  placeholder="e.g. alex@example.com"
                />
              </label>
              <button className="ai-start-btn" type="submit">
                <span>Start AI Interview</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </button>
            </form>
            {error && <p className="ai-error-banner">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  // Screen 4: Active Fullscreen AI Interview with Subtitle & Speak-to-type Dock
  return (
    <div className="ai-interview-page">
      {/* 1. Fullscreen 3D Avatar view */}
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
          <h2 className="ai-hud-title">{interview.title}</h2>

          {/* Avatar Switcher Pill in Active Interview HUD */}
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
          <div className="ai-hud-pill ai-progress-pill">
            Question <strong className="ai-accent-text">{index + 1}</strong> of {interview.questions.length}
          </div>
          <div className={`ai-hud-pill ai-timer-pill ${secondsLeft < 300 ? 'timer-warning' : ''}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{time}</span>
          </div>
          <div className="ai-hud-pill ai-candidate-pill">
            <span>👤 {candidate.name}</span>
          </div>
        </div>
      </header>

      {/* 3. Subtitle Overlay with Live Speaking Waves and Repeat Audio button */}
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
            onClick={repeatQuestion}
            disabled={isSpeaking}
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
          "{interview.questions[index]?.text}"
        </div>
      </div>

      {/* 4. Bottom Response Dock (Replaces the big card div) */}
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
                onClick={toggleSpeech}
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
                disabled={!answer.trim()}
              >
                <span>{index === interview.questions.length - 1 ? 'Submit & Finish' : 'Next Question'}</span>
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
    </div>
  );
};

const ManageInterview = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const ownerKey = searchParams.get('owner_key');

  const fetchDashboard = () => {
    setIsRefreshing(true);
    axios.get(`${API}/hosted-interviews/${token}/dashboard/?owner_key=${ownerKey}`)
      .then(response => setData(response.data))
      .catch(() => setError('This dashboard link is invalid or expired.'))
      .finally(() => setIsRefreshing(false));
  };

  useEffect(() => {
    fetchDashboard();
  }, [token, ownerKey]);

  if (error) {
    return (
      <div className="creator-page">
        <section className="creator-card">
          <p className="creator-error-banner">{error}</p>
          <button type="button" className="creator-back-btn" onClick={() => navigate('/')} style={{ marginTop: '1rem' }}>
            Back to Dashboard
          </button>
        </section>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="creator-page">
        <section className="creator-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="ai-spinner" />
          <p className="creator-subtitle">Loading Owner Dashboard...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="creator-page">
      <div className="creator-topbar">
        <button type="button" className="creator-back-btn" onClick={() => navigate('/')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to Dashboard</span>
        </button>
      </div>

      <section className="creator-card share-card">
        <div className="creator-badge live">
          <span className="ai-live-dot" />
          <span>OWNER DASHBOARD</span>
        </div>
        <h1 className="creator-title">{data.title}</h1>
        <p className="creator-subtitle">
          Monitor your candidate submissions in real-time. Export all evaluations and detailed scores to CSV whenever you need.
        </p>
        <div className="creator-actions-row">
          <a className="creator-download-btn" href={`${API}/hosted-interviews/${token}/results.csv?owner_key=${ownerKey}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download All Results CSV</span>
          </a>
        </div>
      </section>

      <section className="creator-card">
        <div className="section-heading">
          <div>
            <div className="creator-badge studio">
              <span>CANDIDATE PROGRESS</span>
            </div>
            <h2>Live Submissions</h2>
          </div>
          <button type="button" className={`refresh-btn ${isRefreshing ? 'refreshing' : ''}`} onClick={fetchDashboard}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>

        {data.attempts.length === 0 ? (
          <div className="empty-attempts">
            <p>No candidates have attempted this interview yet.</p>
          </div>
        ) : (
          <div className="candidate-table">
            <div className="table-head">
              <span>Candidate</span>
              <span>Status</span>
              <span>Score</span>
              <span>AI Remarks</span>
            </div>
            {data.attempts.map(attempt => (
              <div className="table-row" key={attempt.id}>
                <strong>{attempt.candidate_name}</strong>
                <span>
                  <span className={`status-pill ${attempt.status === 'completed' ? 'completed' : 'in-progress'}`}>
                    {attempt.status === 'completed' ? '✓ Completed' : '● In Progress'}
                  </span>
                </span>
                <span className="score-text">
                  {attempt.score == null ? '-' : `${attempt.score} / ${attempt.max_score}`}
                </span>
                <span className="remarks-text">{attempt.remarks || 'In progress...'}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export { CandidateInterview, CreatorInterview, ManageInterview };
