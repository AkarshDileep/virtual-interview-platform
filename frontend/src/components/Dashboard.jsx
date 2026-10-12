import React from 'react';
import { useNavigate } from 'react-router-dom';
import TechText from './TechText';
import HoldButton from './HoldButton';

const Dashboard = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate('/interview', { state: { playIntro: true } });
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="dashboard-badge">
          <span className="ai-live-dot" />
          <span>Next-Gen AI Simulation</span>
        </div>

        <div className="tech-title-wrap">
          <TechText
            text="Virtual Interview Pro"
            fontWeight={700}
            fontSize={95}
            color="#ffffff"
            accentColor="#a78bfa"
            reveal="letter"
            dashLength={4}
            dashGap={2}
            specks={16}
            reach={180}
            draggable={true}
            sweep={true}
            speed={1}
          />
        </div>

        <p className="subtitle">
          Experience the next generation of interview preparation. 
          Interact with a photorealistic 3D interviewer in real-time, 
          practice your answers with speech recognition, and build confidence.
        </p>

        <div className="dashboard-chips">
          <div className="dashboard-chip">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
            <span>Real-Time Voice AI</span>
          </div>
          <div className="dashboard-chip">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"/>
              <polyline points="2 17 12 22 22 17"/>
              <polyline points="2 12 12 17 22 12"/>
            </svg>
            <span>Photorealistic 3D Avatar</span>
          </div>
          <div className="dashboard-chip">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 14 14"/>
            </svg>
            <span>Instant Feedback & Scoring</span>
          </div>
        </div>

        <div className="dashboard-actions">
          <HoldButton
            size="lg"
            backgroundColor="rgba(30, 27, 75, 0.75)"
            fillColor="#6366f1"
            textColor="#f8fafc"
            fillTextColor="#ffffff"
            holdTime={1200}
            releaseTime={200}
            radius={28}
            glow={true}
            wave={true}
            pressScale={0.96}
            doneLabel="Launching Interview..."
            onHold={handleStart}
            onTap={handleStart}
            className="dashboard-hold-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ marginRight: '6px' }}>
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Press & Hold to Start Interview
          </HoldButton>

          <button
            type="button"
            className="dashboard-create-btn"
            onClick={() => navigate('/create-interview')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Create Custom Interview Link</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
