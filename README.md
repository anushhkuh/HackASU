# 🧠 Let's Lock In

An ADHD-smart study companion built for neurodiverse learners.

# 📚 Overview

Let’s Lock In is a web platform designed to help students-especially those with ADHD - organize, focus, and complete assignments more effectively.
By integrating with Canvas LMS, the platform automatically fetches coursework, deadlines, and effort estimates, then gamifies productivity through rewards, focus timers, and attention tracking.

It’s built to support the ADHD brain: dynamic, interest-driven, and responsive — turning academic overwhelm into structured, achievable progress.

# ✨ Key Features 

Key ADHD-Specific Features

🎮 Gamified Dashboard: Earn badges, streaks, and points for staying on track.

⏱️ Pomodoro Timer & Chunking: Break large tasks into focus sessions and manageable steps.

📅 Smart Reminders & Recommendations: Personalized suggestions based on user activity and assignment patterns.

🧠 Attention Checks: Optional face and pose estimation (MediaPipe) to detect when focus drifts — with clear consent and privacy controls.

📝 In-App Notes & Study Tools: Create lecture notes, exam “cheatsheets,” and summaries right inside the dashboard.

📊 Canvas Sync: Automatically imports due dates, grades, and announcements for real-time progress tracking.

# 🧩 Architecture & Tech Stack 

Frontend: React.js (interactive UI)
Backend: Node.js (API handling, gamification logic)
Database: PostgreSQL
Integration: Canvas API with OAuth2 authentication
Attention Tracking: MediaPipe
Real-Time Features: WebSockets for live study rooms

# 🔐 Privacy & Compliance 

100% opt-in attention tracking - user consent required- runs in browser and does not store recordings.

All Canvas data is securely fetched via OAuth2; no password storage.

Users can delete all data at any time.

# 🚀 How It Works 

Student logs in with Canvas credentials.

Dashboard loads assignments and deadlines automatically.

User plans study sessions using Pomodoro chunking.

Smart reminders and progress streaks keep engagement high.

Attention checks help sustain focus with built-in breaks.

# 🧠 Research Basis

The project is inspired by ADHD research on executive dysfunction, time blindness, and dopamine-driven motivation cycles.
Studies show that 15–17% of college students report ADHD symptoms, and up to 25% of those using disability services have ADHD.
By applying behavioral psychology principles — like positive reinforcement and chunked task structures — Let’s Lock In helps students sustain motivation and achieve consistency.

# 💡 Future Plans

Add mobile notifications and voice reminders

Introduce AI-powered summarization for lecture notes

Integrate focus music and mood-based study modes

Partner with ADHD researchers for personalized cognitive metrics

🧑‍💻 Contributors

Himanshu Kolla — UI desiginer & Research Designer
Anushka Tiwari - Backend Architecture + Frontend additions 
Vishnu Uppalapati - API implementation
Chaitanya Nookala - Backend Face posture estimator 


🪪 License

This project is open-source under the MIT License.
