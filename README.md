# 🎙️ Virtual Interview Pro

An intelligent, interactive AI-powered virtual interview platform featuring 3D avatar interviewers, real-time speech synthesis with procedural lip-sync, speech-to-text live transcription, AI evaluation, and custom hosted candidate interview rooms.

---

## 🌟 Key Features

- **🎭 Realistic 3D AI Interviewers (Three.js & React Three Fiber)**
  - Interactive 3D avatars including **Lead Tech Interviewer**, **Facial Animation Specialist**, and an **Animated Sundar Pichai Avatar**.
  - Natural idle postures, eye contact tracking, blinking, head-tilts, conversational nodding, and synchronized greeting wave animations.
  - Procedural lip-sync driven by speech analysis and facial viseme morph targets.

- **🗣️ Voice & Speech-to-Text Integration**
  - **Text-to-Speech (TTS)**: Avatars speak questions aloud with tailored voice profiles, pitch, rate, and personalized greetings.
  - **Live Speech-to-Type (STT)**: Real-time candidate audio transcription powered by the Web Speech API, with interim result streaming and automatic pause handling.

- **⚡ Tailored AI Interview Sessions**
  - Upload a resume (PDF/DOCX) and job description to dynamically generate 15 customized, role-specific technical screening questions.
  - Comprehensive post-interview scoring, competency breakdown, detailed feedback, and recommendations.

- **🏢 Custom Hosted Interview Studio (Recruiter / Hiring Manager Mode)**
  - Create custom interview sessions with specific time limits, question builders, and quick template ideas.
  - Generate shareable candidate links (`/candidate/:token`) for frictionless, direct candidate access.
  - **Real-Time Recruiter Dashboard (`/manage/:token`)**: Monitor live candidate attempts, view scores and remarks, and export full results to CSV.

- **💎 Modern Cyber-Glass Aesthetic**
  - High-performance fluid shader background powered by WebGL/OGL.
  - Responsive layout, sleek HUD overlays, live speaking indicators, and interactive 3D studio desks.

---

## 🏗️ Tech Stack

### Frontend
- **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **3D Graphics & Animations**: [Three.js](https://threejs.org/), [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber), [@react-three/drei](https://github.com/pmndrs/drei), [OGL](https://github.com/oframe/ogl)
- **Routing & Networking**: [React Router DOM](https://reactrouter.com/), [Axios](https://axios-http.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

### Backend
- **Framework**: [Django](https://www.djangoproject.com/) + [Django REST Framework](https://www.django-rest-framework.org/)
- **CORS Support**: `django-cors-headers`
- **Database**: SQLite (Default)

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **Python** (v3.10 or higher recommended)
- Modern web browser with WebGL and Web Speech API support (Google Chrome, Microsoft Edge, Brave)

---

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
# Windows:
python -m venv venv
.\venv\Scripts\activate

# macOS / Linux:
python3 -m venv venv
source venv/bin/activate

# Install required dependencies
pip install django djangorestframework django-cors-headers

# Run database migrations
python manage.py migrate

# Start the Django development server
python manage.py runserver 8000
```

The Django API server will run at `http://127.0.0.1:8000/`.

---

### 2. Frontend Setup

```bash
# Open a new terminal and navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

The React frontend will be accessible at `http://localhost:5173/`.

---

## 📁 Project Structure

```text
virtualinterview/
├── backend/
│   ├── api/                   # REST API views, models, and endpoints
│   │   ├── models.py          # Hosted interview and attempt schemas
│   │   ├── views.py           # Generation, evaluation, and session handling
│   │   └── urls.py            # API routing
│   ├── backend/               # Django project settings & configuration
│   └── manage.py              # Django management script
├── frontend/
│   ├── public/                # 3D .glb models, video assets, and textures
│   ├── src/
│   │   ├── components/
│   │   │   ├── Avatar.jsx            # 3D Avatar rigging, procedural lip-sync & animations
│   │   │   ├── avatarOptions.js      # Character voice profiles, pitch, rate & metadata
│   │   │   ├── Dashboard.jsx         # Landing page and navigation portal
│   │   │   ├── HostedInterview.jsx   # Studio creator, candidate room & recruiter dashboard
│   │   │   ├── Interview.jsx         # AI practice interview session with resume parsing
│   │   │   ├── MicroSlats.jsx        # WebGL fluid shader dynamic canvas
│   │   │   └── VirtualInterviewer.jsx# 3D Canvas stage with desk & lighting setup
│   │   ├── App.jsx            # Application routing
│   │   ├── index.css          # Theme tokens & glassmorphism styling
│   │   └── main.jsx           # App entry point
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🎙️ Browser Permissions Note

To use the voice features:
1. **Microphone**: Allow microphone permissions when prompted to use the **Speak to type** feature.
2. **Audio / Speech**: Ensure system audio is enabled so the 3D interviewer can speak questions and greetings.

---

## 📄 License

This project is licensed under the MIT License - feel free to adapt and build upon it!
