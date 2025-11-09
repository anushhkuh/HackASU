# Focus & Posture Monitor (Face Pose Estimation)

## Quick start
1. Clone repo
2. Create virtualenv and activate
3. `pip install -r requirements.txt`
4. Run server: `python server/app.py`
5. Open `http://127.0.0.1:5000`

## File layout
- `frontend/` — index.html, script.js, style.css
- `server/app.py` — Flask backend
- `server/model.py` — classifier/pose logic
- `server/models/` — (optional) model weights (not committed)

## Notes
- If model weights are large, download them separately and put into `server/models/`.
- Keep secrets out of repo — use `.env` for keys and add it to `.gitignore`.
