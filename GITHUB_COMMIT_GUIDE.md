# What to Commit to GitHub

## ✅ Files to COMMIT (Source Code & Configuration)

### Essential Files:
- **`package.json`** - Dependencies and scripts
- **`package-lock.json`** - Locked dependency versions
- **`.gitignore`** - Git ignore rules

### Source Code:
- **`src/`** - All React components and source files
  - `App.js`, `App.css`
  - `Dashboard.js`, `Dashboard.css`
  - `StudyPlan.js`, `StudyPlan.css`
  - `Pomodoro.js`, `Pomodoro.css`
  - `index.js`, `index.css`
  - `apiClient.js`
  - `canvasClient.js`
  - `useBackend.js`
  - All other `.js` and `.css` files in `src/`

### Public Assets:
- **`public/`** - Static files
  - `index.html`
  - `favicon.ico`
  - `logo192.png`, `logo512.png`
  - `manifest.json`
  - `robots.txt`

### Server (if part of your project):
- **`server/`** - Server files
  - `index.js`

### Documentation:
- **`README.md`** - Main project documentation

## ❌ Files to NOT COMMIT (Already in .gitignore)

### Build & Dependencies:
- **`/build`** - Production build (generated)
- **`/node_modules`** - Dependencies (install with `npm install`)

### Environment & Secrets:
- **`.env.local`** - Local environment variables (contains tokens!)
- **`.env`** - Environment variables
- Any file containing:
  - API keys
  - Tokens (like Canvas token)
  - Database passwords
  - JWT secrets

### Logs & Temporary Files:
- **`*.log`** - Log files
- **`npm-debug.log*`** - Debug logs

### IDE & OS Files:
- **`.vscode/`**, **`.idea/`** - IDE settings
- **`.DS_Store`** - macOS files
- **`Thumbs.db`** - Windows files

### Temporary Documentation (Optional - can delete):
- `BACKEND_SETUP.md`
- `HACKASU_BACKEND_SETUP.md`
- `PORT_SETUP.md`
- `START_APP.md`
- `START_BACKEND.md`

## 🔒 Security Reminders

**NEVER commit:**
- Canvas LMS tokens
- API keys
- Database connection strings
- JWT secrets
- Any `.env` files
- Personal credentials

## 📝 Recommended README.md Content

Your README.md should include:
- Project description
- Installation instructions (`npm install`)
- How to run (`npm start`)
- Environment variables needed (without actual values)
- Features overview

## Quick Checklist Before Committing

```bash
# Check what will be committed
git status

# Make sure these are NOT listed:
# - .env.local
# - node_modules/
# - build/
# - Any files with tokens/keys
```

## Example .env.local Template (Create but DON'T commit)

Create a `.env.example` file (this CAN be committed) with:

```env
PORT=3001
REACT_APP_USE_BACKEND=true
REACT_APP_API_BASE_URL=http://localhost:3000
REACT_APP_CANVAS_BASE_URL=https://your-institution.instructure.com
REACT_APP_CANVAS_TOKEN=your-token-here
```

Then users can copy it to `.env.local` and fill in their values.

