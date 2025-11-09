# Focus Pocus - ADHD Study Management App

A comprehensive study management application for students with ADHD, featuring Canvas LMS integration, Pomodoro timer, gamification, and personalized study tools.

## Features

### Frontend (React)
- **Assignment Dashboard**: Visual progress tracking with heatmaps and streaks
- **Study Plan Creator**: Create and manage assignments with chunking
- **Canvas LMS Integration**: Import assignments directly from Canvas
- **Pomodoro Timer**: Draggable timer widget for focused study sessions
- **Progress Tracking**: Visual progress bars and completion tracking

### Backend (Node.js/Express)
- **Canvas LMS Integration**: OAuth2 authentication and automatic assignment syncing
- **Assignment Management**: Track assignments with due dates, durations, and chunking
- **Study Sessions**: Pomodoro timer integration and study session tracking
- **Note-Taking**: Lecture notes, exam cheatsheets, and assignment planning templates
- **Gamification**: Badges, streaks, and progress tracking
- **Reminders**: Smart reminders for assignments and study sessions
- **Activity Logging**: Comprehensive activity tracking for ML/recommendations
- **Dashboard**: Personalized dashboard with stats and insights

## Tech Stack

### Frontend
- **Framework**: React 19.2.0
- **Build Tool**: Create React App
- **Styling**: CSS

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM (or SQLite for development)
- **Authentication**: JWT + Canvas OAuth2

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- PostgreSQL (optional - can use SQLite for development)

### Frontend Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env.local` file:**
   ```env
   PORT=3001
   REACT_APP_USE_BACKEND=true
   REACT_APP_API_BASE_URL=http://localhost:3000
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

   The app will open at `http://localhost:3001`

### Backend Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file:
   ```env
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="your-secret-key"
   PORT=3000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3001
   ```

3. **Set up database:**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. **Start the backend server:**
   ```bash
   npm start
   ```

   The backend will run on `http://localhost:3000`

## Project Structure

```
adhd-study-app/
├── src/              # Frontend React components
│   ├── App.js        # Main app component
│   ├── Dashboard.js  # Assignment dashboard
│   ├── StudyPlan.js  # Study plan creator
│   ├── Pomodoro.js   # Pomodoro timer
│   └── ...
├── public/           # Static assets
├── server/           # Proxy server (optional)
├── src/              # Backend source (if backend in root)
│   ├── server.js     # Express server
│   ├── routes/       # API routes
│   └── ...
└── prisma/           # Database schema
```

## Available Scripts

### Frontend
- `npm start` - Start React development server
- `npm run build` - Build for production
- `npm test` - Run tests

### Backend
- `npm start` - Start Express server
- `npm run dev` - Start with nodemon (auto-reload)
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations

## Canvas LMS Integration

The app supports importing assignments from Canvas LMS:

1. Click "Import from Canvas" in the Study Plan section
2. Enter your Canvas instance URL (e.g., `https://your-school.instructure.com`)
3. Enter your Canvas access token
4. Select courses and assignments to import

## License

MIT
