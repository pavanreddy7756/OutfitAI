# OutfitAI - Quick Start Guide

## Prerequisites
- Python 3.9+
- Node.js 16+
- npm or yarn
- Xcode (for iOS) / Android Studio (for Android)
- Expo CLI (optional, installed via npm)
- OpenAI API Key

## 1. Backend Setup

### Start the FastAPI server:

```bash
cd backend
chmod +x start.sh
./start.sh
```

Or manually:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

### Verify backend is running:
- Visit http://localhost:8000 (should see welcome message)
- Visit http://localhost:8000/docs (interactive API documentation)
- Visit http://localhost:8000/health (health check)

---

## 2. Configure OpenAI API

Edit `backend/.env`:
```
OPENAI_API_KEY=sk-your-actual-key-here
```

Get your key from: https://platform.openai.com/api-keys

---

## 3. Mobile App Setup

### Start the Expo development server:

```bash
cd mobile
chmod +x start.sh
./start.sh
```

Or manually:
```bash
cd mobile
npm start
```

**Expected output:**
```
✔ Metro bundler started
To run the app with live reloading, choose one of the following:

› Using Expo Go
  ...
› Press 'i' to open iOS simulator
› Press 'a' to open Android emulator
```

---

## 4. Running on iOS Simulator

1. Make sure Xcode is installed
2. From the Expo menu, press `i`
3. Simulator will launch with the app
4. Shake device → select "Reload"

**API Configuration for iOS Simulator:**
- Update `mobile/src/api/config.js`
- Use `http://localhost:8000` as API_BASE_URL (simulator has direct access to host machine)

---

## 5. Running on Android Emulator

1. Make sure Android Studio is installed
2. Start Android emulator from Android Studio
3. From the Expo menu, press `a`
4. App will load in emulator
5. Shake device → select "Reload"

**API Configuration for Android Emulator:**
- Update `mobile/src/api/config.js`
- Use `http://10.0.2.2:8000` as API_BASE_URL (emulator's gateway to host)

---

## 6. Running on Physical Device

1. Install Expo Go app from App Store / Play Store
2. Run `npm start` in mobile directory
3. Scan QR code with your phone camera (iOS) or Expo Go app (Android)

**API Configuration for Physical Device:**
- Find your machine's IP: `ifconfig | grep "inet "`
- Update `mobile/src/api/config.js`
- Use `http://YOUR_IP:8000` as API_BASE_URL

---

## 7. Testing the API

### Register a new user:
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'
```

### Login:
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Response will include `access_token` - save this for authenticated requests.

### Upload clothing item:
```bash
curl -X POST http://localhost:8000/api/clothing/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "category=shirt" \
  -F "color=blue"
```

---

## 8. App Workflow

1. **Register/Login** - Create account or sign in
2. **Upload Clothes** - Take or select photos of clothing items
3. **View Collection** - Browse all uploaded clothing
4. **Generate Outfits** - Select occasion and let AI suggest combinations
5. **Save Favorites** - Mark outfits as favorites
6. **View History** - See all generated outfits

---

## 9. Troubleshooting

### Backend won't start
```bash
# Kill any process on port 8000
lsof -ti:8000 | xargs kill -9

# Check Python version
python3 --version

# Recreate virtual environment
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Mobile app connection issues
- Ensure backend is running: `curl http://localhost:8000`
- Check firewall settings
- Try clearing Expo cache: `npm start -- --clear`
- Verify API_BASE_URL in config matches your setup

### Image upload fails
- Check uploads directory exists: `ls -la backend/uploads/`
- Verify disk space available
- Check file permissions: `chmod 755 backend/uploads/`

### OpenAI API errors
- Verify API key is correct
- Check OpenAI account has credits
- Ensure API is enabled in OpenAI console

---

## 10. Development Tips

### Hot Reload
- Mobile app: Changes auto-reload (watch mode)
- Backend: Server reloads on code changes (--reload flag)

### Database Reset
```bash
# Delete SQLite database to start fresh
rm backend/test.db
# Restart server to recreate empty database
```

### View Database
```bash
# Install sqlite3 if needed
brew install sqlite3

# Open database
sqlite3 backend/test.db

# View tables
.tables

# View schema
.schema
```

### Debugging
- Backend: Check console output for errors
- Mobile: Use Expo debugging tools (shake device menu)
- Use browser DevTools for web debugging

---

## Directory Structure

```
OutfitAI/
├── backend/
│   ├── app/
│   │   ├── models/          # Database models
│   │   ├── routes/          # API endpoints
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic (AI)
│   │   ├── utils/           # Helper functions
│   │   ├── config.py        # Configuration
│   │   ├── database.py      # Database setup
│   │   └── __init__.py
│   ├── uploads/             # Uploaded images
│   ├── main.py              # FastAPI app
│   ├── requirements.txt      # Python dependencies
│   ├── .env                 # Environment variables
│   └── start.sh             # Startup script
│
├── mobile/
│   ├── src/
│   │   ├── api/             # API configuration
│   │   ├── screens/         # React Native screens
│   │   └── services/        # API service layer
│   ├── App.js               # Main app component
│   ├── app.json             # Expo config
│   ├── package.json         # JS dependencies
│   ├── start.sh             # Startup script
│   └── node_modules/
│
├── .gitignore
├── README.md
└── QUICKSTART.md (this file)
```

---

## Next Steps

1. ✅ Backend structure created
2. ✅ Mobile app scaffolding done
3. 🔜 Add more UI polish and animations
4. 🔜 Implement outfit selection from clothing list
5. 🔜 Add weather integration
6. 🔜 Implement outfit sharing
7. 🔜 Add user preferences/style profile
8. 🔜 Deploy to production

---

**Happy coding! 🎉**
