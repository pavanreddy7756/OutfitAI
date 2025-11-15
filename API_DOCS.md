# OutfitAI API Documentation

## Base URL
- **Production**: TBD (deploy to cloud)
- **Development**: `http://localhost:8000`

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Authentication Endpoints

### 1. Register User
**POST** `/api/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "securepassword123"
}
```

**Response (201):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "username",
  "is_active": true,
  "created_at": "2025-11-15T10:30:00"
}
```

**Error (400):**
```json
{
  "detail": "Email or username already registered"
}
```

---

### 2. Login
**POST** `/api/auth/login`

Authenticate user and receive access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user_id": 1
}
```

**Error (401):**
```json
{
  "detail": "Invalid email or password"
}
```

---

## Clothing Items Endpoints

### 3. Upload Clothing Item
**POST** `/api/clothing/upload`

Upload a photo of a clothing item. The system will automatically analyze the image using AI.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file` (required): Image file (JPEG, PNG)
- `category` (optional): Item category (shirt, pants, shoes, dress, jacket, etc.)
- `color` (optional): Dominant color
- `style` (optional): Style type (casual, formal, sporty, vintage, etc.)
- `season` (optional): Season (spring, summer, fall, winter)
- `brand` (optional): Brand name
- `description` (optional): Item description

**cURL Example:**
```bash
curl -X POST http://localhost:8000/api/clothing/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@shirt.jpg" \
  -F "category=shirt" \
  -F "color=blue"
```

**Response (200):**
```json
{
  "id": 1,
  "user_id": 1,
  "image_path": "/uploads/1_shirt.jpg",
  "category": "shirt",
  "color": "blue",
  "style": "casual",
  "season": null,
  "brand": null,
  "description": null,
  "created_at": "2025-11-15T10:35:00"
}
```

---

### 4. Get All Clothing Items
**GET** `/api/clothing/items`

Retrieve all clothing items for the authenticated user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
[
  {
    "id": 1,
    "user_id": 1,
    "image_path": "/uploads/1_shirt.jpg",
    "category": "shirt",
    "color": "blue",
    "style": "casual",
    "season": null,
    "brand": "Nike",
    "description": null,
    "created_at": "2025-11-15T10:35:00"
  },
  {
    "id": 2,
    "user_id": 1,
    "image_path": "/uploads/1_pants.jpg",
    "category": "pants",
    "color": "black",
    "style": "formal",
    "season": null,
    "brand": "Zara",
    "description": null,
    "created_at": "2025-11-15T10:40:00"
  }
]
```

---

### 5. Get Specific Clothing Item
**GET** `/api/clothing/items/{item_id}`

Retrieve details of a specific clothing item.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Parameters:**
- `item_id` (path): ID of the clothing item

**Response (200):**
```json
{
  "id": 1,
  "user_id": 1,
  "image_path": "/uploads/1_shirt.jpg",
  "category": "shirt",
  "color": "blue",
  "style": "casual",
  "season": null,
  "brand": "Nike",
  "description": null,
  "created_at": "2025-11-15T10:35:00"
}
```

**Error (404):**
```json
{
  "detail": "Clothing item not found"
}
```

---

### 6. Delete Clothing Item
**DELETE** `/api/clothing/items/{item_id}`

Remove a clothing item and its image from the collection.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Parameters:**
- `item_id` (path): ID of the clothing item

**Response (200):**
```json
{
  "message": "Clothing item deleted"
}
```

**Error (404):**
```json
{
  "detail": "Clothing item not found"
}
```

---

## Outfit Endpoints

### 7. Generate Outfit Suggestion
**POST** `/api/outfits/generate`

Generate AI-powered outfit suggestions based on selected clothing items and occasion.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "occasion": "casual",
  "clothing_item_ids": [1, 2, 3],
  "season": "spring",
  "weather": "sunny"
}
```

**Parameters:**
- `occasion` (required): Occasion type (casual, formal, workout, date, party, etc.)
- `clothing_item_ids` (required): List of clothing item IDs to use
- `season` (optional): Season for recommendations
- `weather` (optional): Weather condition (sunny, rainy, cold, etc.)

**Response (200):**
```json
{
  "id": 1,
  "user_id": 1,
  "occasion": "casual",
  "season": "spring",
  "weather": "sunny",
  "description": null,
  "ai_suggestions": "[{\"outfit\": \"Blue shirt with black pants\", \"reason\": \"Classic casual combination...\", \"confidence\": 9}]",
  "is_favorite": 0,
  "created_at": "2025-11-15T10:45:00",
  "outfit_items": [
    {
      "clothing_item": {
        "id": 1,
        "user_id": 1,
        "image_path": "/uploads/1_shirt.jpg",
        "category": "shirt",
        "color": "blue",
        "style": "casual",
        "season": null,
        "brand": "Nike",
        "description": null,
        "created_at": "2025-11-15T10:35:00"
      }
    }
  ]
}
```

**Error (400):**
```json
{
  "detail": "No valid clothing items provided"
}
```

---

### 8. Get All Outfits
**GET** `/api/outfits`

Retrieve all generated outfits for the authenticated user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
[
  {
    "id": 1,
    "user_id": 1,
    "occasion": "casual",
    "season": "spring",
    "weather": "sunny",
    "description": null,
    "ai_suggestions": "...",
    "is_favorite": 0,
    "created_at": "2025-11-15T10:45:00",
    "outfit_items": [...]
  }
]
```

---

### 9. Get Specific Outfit
**GET** `/api/outfits/{outfit_id}`

Retrieve details of a specific outfit.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Parameters:**
- `outfit_id` (path): ID of the outfit

**Response (200):**
```json
{
  "id": 1,
  "user_id": 1,
  "occasion": "casual",
  "season": "spring",
  "weather": "sunny",
  "description": null,
  "ai_suggestions": "...",
  "is_favorite": 0,
  "created_at": "2025-11-15T10:45:00",
  "outfit_items": [...]
}
```

**Error (404):**
```json
{
  "detail": "Outfit not found"
}
```

---

### 10. Toggle Outfit as Favorite
**POST** `/api/outfits/{outfit_id}/favorite`

Mark an outfit as favorite or remove from favorites.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Parameters:**
- `outfit_id` (path): ID of the outfit

**Response (200):**
```json
{
  "id": 1,
  "user_id": 1,
  "occasion": "casual",
  "season": "spring",
  "weather": "sunny",
  "description": null,
  "ai_suggestions": "...",
  "is_favorite": 1,
  "created_at": "2025-11-15T10:45:00",
  "outfit_items": [...]
}
```

---

### 11. Delete Outfit
**DELETE** `/api/outfits/{outfit_id}`

Remove an outfit from the history.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Parameters:**
- `outfit_id` (path): ID of the outfit

**Response (200):**
```json
{
  "message": "Outfit deleted"
}
```

**Error (404):**
```json
{
  "detail": "Outfit not found"
}
```

---

## Utility Endpoints

### 12. Health Check
**GET** `/health`

Check if the API is running.

**Response (200):**
```json
{
  "status": "healthy"
}
```

---

### 13. Root Endpoint
**GET** `/`

Get API information.

**Response (200):**
```json
{
  "message": "Welcome to Outfit AI API",
  "docs": "http://localhost:8000/docs",
  "version": "1.0.0"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes:
- **200 OK** - Request successful
- **201 Created** - Resource created successfully
- **400 Bad Request** - Invalid request parameters
- **401 Unauthorized** - Missing or invalid authentication token
- **404 Not Found** - Resource not found
- **500 Internal Server Error** - Server error

---

## Rate Limiting & Quotas

Currently, there are no rate limits. In production, consider implementing:
- API rate limiting (e.g., 100 requests/minute per user)
- OpenAI API quota management
- Daily clothing upload limits

---

## Interactive API Documentation

Visit **`http://localhost:8000/docs`** for interactive Swagger UI documentation where you can:
- Test all endpoints directly
- View request/response schemas
- Authorize with your token
- Generate code samples

---

## Testing the API

### Using cURL
See test examples in `backend/test_api.py`

### Using the test script
```bash
cd backend
pip install requests
python test_api.py
```

### Using Postman
- Import endpoints and create requests
- Set `Authorization` header: `Bearer <token>`
- Test form data uploads with image files

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email VARCHAR UNIQUE,
  username VARCHAR UNIQUE,
  hashed_password VARCHAR,
  is_active BOOLEAN,
  created_at DATETIME,
  updated_at DATETIME
);
```

### Clothing Items Table
```sql
CREATE TABLE clothing_items (
  id INTEGER PRIMARY KEY,
  user_id INTEGER FOREIGN KEY,
  image_path VARCHAR,
  category VARCHAR,
  color VARCHAR,
  brand VARCHAR,
  style VARCHAR,
  season VARCHAR,
  description TEXT,
  created_at DATETIME,
  updated_at DATETIME
);
```

### Outfits Table
```sql
CREATE TABLE outfits (
  id INTEGER PRIMARY KEY,
  user_id INTEGER FOREIGN KEY,
  occasion VARCHAR,
  season VARCHAR,
  weather VARCHAR,
  description TEXT,
  ai_suggestions TEXT (JSON),
  is_favorite BOOLEAN,
  created_at DATETIME,
  updated_at DATETIME
);
```

### Outfit Items Table
```sql
CREATE TABLE outfit_items (
  id INTEGER PRIMARY KEY,
  outfit_id INTEGER FOREIGN KEY,
  clothing_item_id INTEGER FOREIGN KEY
);
```

---

## Notes

- All timestamps are in UTC (ISO 8601 format)
- Image paths are relative URLs that can be accessed at `/uploads/{filename}`
- AI suggestions are stored as JSON strings for flexibility
- User authentication is stateless using JWT tokens
- Token expiration is configurable (default: 30 minutes)

---

**Last Updated**: November 15, 2025
**API Version**: 1.0.0
