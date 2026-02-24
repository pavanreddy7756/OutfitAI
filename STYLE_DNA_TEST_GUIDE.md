# Style DNA Quick Test Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Start Backend
```bash
cd /Users/pavanreddy/OutfitAI/backend
./start.sh
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### Step 2: Start Mobile App
```bash
cd /Users/pavanreddy/OutfitAI/mobile
npm start
```

Scan QR code with Expo Go app on your phone.

### Step 3: Test the Flow

1. **Login** to the app (or create account)
2. **Tap profile icon** in top-right header
3. Should see **"Create Your Style DNA"** screen
4. Tap **"Get Started"**
5. Read welcome screen, tap **"Let's Begin"**
6. **Upload face photo**:
   - Use camera or gallery
   - Take clear, well-lit face photo
   - Tap "Analyze Face"
   - Wait ~5-10 seconds for AI analysis
7. **View face results**:
   - See skin tone, undertone, seasonal palette
   - See color swatches (best colors for you)
   - Tap "Continue to Body Analysis"
8. **Upload body photo**:
   - Take full-body shot in slim-fit clothes
   - Tap "Analyze Body"
   - Wait ~5-10 seconds
9. **View body results**:
   - See body shape classification
   - See recommended fits
   - Read personalized tips
   - Tap "Complete Profile"
10. **Completion**:
    - See celebration screen
    - Tap "View My Profile"
11. **Profile view**:
    - See complete Style DNA profile
    - All AI-analyzed data displayed
    - Color palettes, body recommendations, tips

### Step 4: Test Additional Features

- **Retake photos**: Tap "Retake Photos" button → restarts flow
- **Delete profile**: Tap trash icon → confirms deletion → shows empty state
- **Navigate back**: Use back button to return to main app

## 🧪 What to Test

### ✅ Happy Path
- [ ] Complete flow works without errors
- [ ] Photos upload successfully
- [ ] AI analysis returns results (not empty)
- [ ] Results display correctly formatted
- [ ] Color swatches render with actual colors
- [ ] Navigation works smoothly
- [ ] Profile persists (close app, reopen)

### ⚠️ Error Cases
- [ ] Try uploading very large photo (should compress)
- [ ] Try uploading non-image file (should validate)
- [ ] Try with poor internet connection (should show error)
- [ ] Try navigating back mid-flow (should handle gracefully)

### 🎨 Visual Checks
- [ ] All screens match Apple-like design
- [ ] Loading spinners appear during uploads
- [ ] Color swatches display actual colors (not just labels)
- [ ] Images preview correctly before upload
- [ ] Text is readable, properly sized
- [ ] Spacing is consistent

## 📱 Sample Photos to Use

### Face Photo Guidelines
- ✅ Well-lit, neutral expression
- ✅ Face clearly visible, no sunglasses
- ✅ Neutral background
- ❌ Avoid heavy filters, poor lighting

### Body Photo Guidelines
- ✅ Full-body shot (head to toe)
- ✅ Slim-fit or form-fitting clothes
- ✅ Neutral standing pose
- ✅ Clear background
- ❌ Avoid baggy clothes, sitting poses

## 🔍 Backend Verification

### Check Database
```bash
cd /Users/pavanreddy/OutfitAI/backend
sqlite3 outfit_ai.db

# View StyleDNA records
SELECT * FROM style_dna;

# View uploaded photos
SELECT * FROM style_dna_photo;

# Exit
.quit
```

### Check Uploaded Photos
```bash
ls -la /Users/pavanreddy/OutfitAI/backend/uploads/style_dna/
```

Should see uploaded image files.

### Test API Directly (Optional)
```bash
# Get profile
curl http://localhost:8000/style-dna/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Upload face photo
curl -X POST http://localhost:8000/style-dna/analyze-face \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "photo=@/path/to/face.jpg"
```

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 8000 is in use
lsof -i :8000
# Kill process if needed
kill -9 <PID>

# Check dependencies
cd /Users/pavanreddy/OutfitAI/backend
pip3 install -r requirements.txt
```

### Mobile won't connect to backend
- Make sure backend is running on http://localhost:8000
- Check `mobile/src/api/config.js` has correct API_BASE_URL
- If using physical device, update to your computer's IP address:
  ```javascript
  export const API_BASE_URL = 'http://192.168.1.X:8000';
  ```

### AI analysis fails
- Verify GEMINI_API_KEY in backend/.env
- Check API quota: https://console.cloud.google.com/
- Check backend logs for error messages

### Photos not uploading
- Check file size (should be < 10MB)
- Verify file format (JPG, PNG)
- Check internet connection
- Look for error alerts in mobile app

### Profile not displaying
- Refresh the screen (pull down)
- Check if profile was created (backend DB)
- Verify GET /style-dna/profile returns data
- Check browser console for errors

## ✨ Expected Results

### Face Analysis Should Return
```json
{
  "skin_tone": "medium",
  "skin_undertone": "warm",
  "seasonal_palette": "autumn",
  "best_colors": ["olive green", "burgundy", "camel", "coral", ...],
  "avoid_colors": ["bright pink", "icy blue", ...]
}
```

### Body Analysis Should Return
```json
{
  "body_shape": "athletic",
  "recommended_fits": ["slim fit", "tailored"],
  "personalized_tips": [
    "Emphasize your shoulders with structured jackets",
    "Try slim-fit jeans to balance proportions",
    ...
  ]
}
```

## 📊 Success Criteria

The implementation is successful if:
1. ✅ User can complete entire flow in < 2 minutes
2. ✅ AI analysis returns meaningful results
3. ✅ All data saves to database
4. ✅ Profile displays correctly with visual elements
5. ✅ No crashes or blocking errors
6. ✅ UX feels smooth and Apple-like
7. ✅ User can retake photos and restart flow
8. ✅ Profile persists across app restarts

---

**Time Estimate**: 10-15 minutes for complete test
**Prerequisites**: Backend running, mobile app connected, test photos ready
**Support**: Check STYLE_DNA_IMPLEMENTATION.md for detailed documentation
