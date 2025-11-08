# ADHD Study Assistant - Backend

A comprehensive backend system for an ADHD-focused study management application with Canvas LMS integration, gamification, and personalized study tools.

## Features

- **Canvas LMS Integration**: OAuth2 authentication and automatic assignment syncing
- **Assignment Management**: Track assignments with due dates, durations, and chunking
- **Study Sessions**: Pomodoro timer integration and study session tracking
- **Note-Taking**: Lecture notes, exam cheatsheets, and assignment planning templates
- **Gamification**: Badges, streaks, and progress tracking
- **Reminders**: Smart reminders for assignments and study sessions
- **Activity Logging**: Comprehensive activity tracking for ML/recommendations
- **Dashboard**: Personalized dashboard with stats and insights

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + Canvas OAuth2
- **Logging**: Winston

## Prerequisites

- Node.js 18+ 
- PostgreSQL 12+ (see `SETUP_POSTGRES.md` for setup instructions)
- Canvas LMS instance (for Canvas integration - optional)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `CANVAS_CLIENT_ID`: Canvas OAuth2 client ID
- `CANVAS_CLIENT_SECRET`: Canvas OAuth2 client secret
- `CANVAS_REDIRECT_URI`: OAuth2 redirect URI
- `CANVAS_BASE_URL`: Your Canvas instance URL
- `PORT`: Server port (default: 3000)
- `FRONTEND_URL`: Frontend URL for CORS

### 3. Database Setup

Generate Prisma client:
```bash
npm run db:generate
```

Run migrations:
```bash
npm run db:migrate
```

Seed initial data (badges):
```bash
npm run db:seed
```

### 4. Create Logs Directory

```bash
mkdir logs
```

### 5. Start Server

Development (with auto-reload):
```bash
npm run dev
```

Production:
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `GET /api/auth/canvas/authorize` - Get Canvas OAuth URL
- `POST /api/auth/canvas/callback` - Handle Canvas OAuth callback
- `POST /api/auth/canvas/disconnect` - Disconnect Canvas

### Assignments
- `GET /api/assignments` - Get all assignments
- `GET /api/assignments/:id` - Get single assignment
- `POST /api/assignments` - Create manual assignment
- `POST /api/assignments/sync` - Sync from Canvas
- `PUT /api/assignments/:id` - Update assignment
- `DELETE /api/assignments/:id` - Delete assignment
- `POST /api/assignments/:id/chunks` - Create chunks
- `POST /api/assignments/:id/chunks/auto` - Auto-generate chunks
- `PATCH /api/assignments/chunks/:chunkId` - Update chunk status

### Notes
- `GET /api/notes` - Get all notes
- `GET /api/notes/:id` - Get single note
- `POST /api/notes` - Create note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note
- `GET /api/notes/templates/:type` - Get note template (lecture, cheatsheet, assignment)

### Study Sessions
- `GET /api/sessions` - Get all sessions
- `GET /api/sessions/:id` - Get single session
- `POST /api/sessions` - Start session
- `PATCH /api/sessions/:id/complete` - Complete session
- `GET /api/sessions/stats/summary` - Get session statistics

### Gamification
- `GET /api/gamification/badges` - Get user badges
- `GET /api/gamification/streaks` - Get user streaks
- `GET /api/gamification/dashboard` - Get gamification dashboard

### Reminders
- `GET /api/reminders` - Get all reminders
- `POST /api/reminders` - Create reminder
- `POST /api/reminders/auto-assignments` - Auto-create reminders for assignments
- `PUT /api/reminders/:id` - Update reminder
- `DELETE /api/reminders/:id` - Delete reminder
- `PATCH /api/reminders/:id/sent` - Mark reminder as sent

### Dashboard
- `GET /api/dashboard` - Get comprehensive dashboard data

### Canvas
- `GET /api/canvas/courses` - Get Canvas courses
- `GET /api/canvas/user` - Get Canvas user info
- `GET /api/canvas/announcements` - Get Canvas announcements

### Recommendations
- `GET /api/recommendations` - Get personalized recommendations based on activity

## Database Schema

The database includes the following main models:
- **User**: User accounts with Canvas integration
- **Assignment**: Assignments synced from Canvas or created manually
- **AssignmentChunk**: Break down assignments into manageable chunks
- **Note**: Lecture notes, cheatsheets, and assignment notes
- **StudySession**: Pomodoro and study sessions
- **Badge**: Achievement badges
- **UserBadge**: User-badge relationships
- **Streak**: Daily/weekly streaks
- **Reminder**: Scheduled reminders
- **ActivityLog**: Activity tracking for ML/recommendations

## Canvas Integration

### Setting up Canvas OAuth2

1. In your Canvas instance, go to **Admin** → **Developer Keys**
2. Create a new developer key with:
   - Redirect URI: `http://localhost:3000/api/auth/canvas/callback` (or your production URL)
   - Scopes: `url:GET|/api/v1/users/self`, `url:GET|/api/v1/courses`, `url:GET|/api/v1/assignments`
3. Copy the Client ID and Client Secret to your `.env` file

### Canvas API Features

- Automatic assignment syncing
- Course information
- Announcements
- User profile data

## Development

### Database Management

View database with Prisma Studio:
```bash
npm run db:studio
```

Create new migration:
```bash
npx prisma migrate dev --name migration_name
```

### Project Structure

```
src/
├── server.js              # Main server file
├── routes/                # API route handlers
│   ├── auth.js
│   ├── assignments.js
│   ├── notes.js
│   ├── sessions.js
│   ├── gamification.js
│   ├── reminders.js
│   ├── dashboard.js
│   └── canvas.js
├── middleware/            # Express middleware
│   ├── auth.js
│   └── errorHandler.js
├── utils/                 # Utility functions
│   ├── logger.js
│   ├── canvas.js
│   ├── activityLogger.js
│   └── gamification.js
└── database/
    └── seed.js            # Database seeding
```

## Security Notes

- Passwords are hashed using bcrypt
- JWT tokens expire after 7 days
- Canvas tokens are stored securely in the database
- All routes (except auth) require authentication
- CORS is configured for frontend URL only

## Future Enhancements

- ML-based recommendation engine using activity logs
- Real-time notifications via WebSockets
- Integration with attention check tools (face recognition, pose estimation)
- Advanced analytics and insights
- Study group/peer features

## License

MIT

