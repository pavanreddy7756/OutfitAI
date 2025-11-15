# OutfitAI - Mobile App Project

## Project Structure

### Backend (FastAPI + Python)
- **Framework**: FastAPI with Uvicorn
- **Database**: SQLite (default) / PostgreSQL (production)
- **Authentication**: JWT tokens with bcrypt password hashing
- **AI Integration**: OpenAI API (Vision + GPT-4)
- **Image Storage**: Local file storage (can be upgraded to S3/Firebase)

**Installed:**
✅ fastapi, uvicorn
✅ sqlalchemy (ORM)
✅ sqlite3 (local database)
✅ PyJWT, bcrypt (authentication)
✅ openai (AI integration)
✅ python-dotenv (environment variables)

**Location**: `/Users/pavanreddy/OutfitAI/backend/`

#### Running the Backend:
```bash
cd /Users/pavanreddy/OutfitAI/backend
source venv/bin/activate
python main.py
```

The API will be available at `http://localhost:8000`

---

### Mobile App (React Native + Expo)
- **Framework**: React Native with Expo
- **Navigation**: React Navigation (bottom tabs)
- **State Management**: React Hooks
- **API Client**: Axios (integrated in ApiService)
- **Image Handling**: Expo Camera + Image Picker
- **Storage**: AsyncStorage for authentication tokens

**Installed:**
✅ react-native, expo
✅ expo-camera, expo-image-picker
✅ @react-navigation/native, @react-navigation/bottom-tabs
✅ @react-native-async-storage/async-storage
✅ axios

**Location**: `/Users/pavanreddy/OutfitAI/mobile/`

#### Running the Mobile App:
```bash
cd /Users/pavanreddy/OutfitAI/mobile
npm start
# Then press 'i' for iOS or 'a' for Android
```

---

## Next Steps to Complete Implementation

### Backend Tasks:
- [ ] Fix image URL serving (add static file serving for image uploads)
- [ ] Implement email verification (optional)
- [ ] Add refresh token mechanism
- [ ] Set up database migrations (Alembic)
- [ ] Add request validation and error handling
- [ ] Implement rate limiting for AI API calls
- [ ] Add logging and monitoring

### Mobile Tasks:
- [ ] Implement bottom tab bar styling and icons
- [ ] Add form validation for clothing item uploads
- [ ] Implement outfit generation with clothing item selection
- [ ] Add image caching and optimization
- [ ] Implement outfit favoriting UI improvements
- [ ] Add loading states and error handling
- [ ] Implement pull-to-refresh on lists
- [ ] Add app permissions handling for camera/gallery

### Features to Add:
- [ ] User profile screen
- [ ] Weather integration
- [ ] Color matching algorithm
- [ ] Outfit sharing functionality
- [ ] Search and filter clothing items
- [ ] Outfit calendar/history
- [ ] User preferences for style recommendations

---

## Environment Variables

### Backend (.env)
```
DATABASE_URL=sqlite:///./test.db
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
OPENAI_API_KEY=your-openai-api-key-here
```

**Update OPENAI_API_KEY before running!**

---

## API Endpoints Summary

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Clothing
- `POST /api/clothing/upload` - Upload clothing item
- `GET /api/clothing/items` - Get all user's clothing
- `GET /api/clothing/items/{id}` - Get specific item
- `DELETE /api/clothing/items/{id}` - Delete item

### Outfits
- `POST /api/outfits/generate` - Generate outfit suggestion
- `GET /api/outfits` - Get all user's outfits
- `GET /api/outfits/{id}` - Get specific outfit
- `POST /api/outfits/{id}/favorite` - Toggle favorite
- `DELETE /api/outfits/{id}` - Delete outfit

---

## Technology Stack Summary

| Layer | Technology |
|-------|-----------|
| **Frontend** | React Native + Expo |
| **Backend** | Python FastAPI |
| **Database** | SQLite (dev) / PostgreSQL (prod) |
| **Authentication** | JWT + Bcrypt |
| **AI/ML** | OpenAI Vision + GPT-4 |
| **Storage** | Local files (upgradeable to S3) |
| **Navigation** | React Navigation |
| **State** | React Hooks |

---

## Troubleshooting

### Backend won't start
- Make sure virtual environment is activated: `source venv/bin/activate`
- Check if port 8000 is available
- Verify OPENAI_API_KEY is set correctly

### Mobile app connection issues
- Update API_BASE_URL in `src/api/config.js` to your backend URL
- On iOS simulator: use `localhost:8000`
- On Android emulator: use `10.0.2.2:8000`
- On physical device: use your machine's IP address

### Image upload fails
- Check image compression is working
- Verify uploads directory exists
- Ensure backend has write permissions

---

**Project initialized on**: November 15, 2025
**Status**: Core structure and basic features implemented ✅
