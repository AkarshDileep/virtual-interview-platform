import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Interview from './components/Interview';
import { CandidateInterview, CreatorInterview, ManageInterview } from './components/HostedInterview';
import MicroSlats from './components/MicroSlats';

function App() {
  return (
    <Router>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <MicroSlats
          preset="swell"
          color="#4537ab"
          glintColor="#a78bfa"
          backgroundColor="#080b14"
          slatWidth={13}
          slatHeight={31}
          gap={1}
          roundness={0}
          interactive
          cursorStrength={1.2}
          cursorSize={40}
          swirl={0.3}
          trail={2.5}
          lean={0.5}
          intro
          introDuration={2}
          paused={false}
        />
      </div>
      <div style={{ position: 'relative', zIndex: 1, width: '100%', minHeight: '100vh' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/interview" element={<Interview />} />
          <Route path="/create-interview" element={<CreatorInterview />} />
          <Route path="/candidate/:token" element={<CandidateInterview />} />
          <Route path="/manage/:token" element={<ManageInterview />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
