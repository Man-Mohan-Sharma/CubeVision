# CubeVision 🧩
### Rubik's Cube Recognition, User Accounts, and Optimal Solution Generation
**Final Year B.Tech Major Project**

- Reworked image processing: the detector now calibrates from the center sticker of each uploaded face instead of relying only on fixed HSV thresholds.
- Invalid detections no longer throw the user back to upload. The app shows the detected grid and lets the user correct stickers in Manual Edit.
- Added JWT authentication: register, login, logout, `/api/auth/me`.
- History and stats are now per-user and protected by JWT.
- Passwords are stored as salted `scrypt` hashes, not plaintext.
- Added backend tests for solver, auth helpers, and calibrated color detection.

## Quick Start

### 1. Install MongoDB Community Edition
Start MongoDB with `mongod`, or use it as a Windows service.

### 2. Backend
```bash
cd backend
copy .env.example .env
npm install
npm run dev
```
Runs on `http://localhost:8000`.

Important `.env` values:
```env
MONGODB_URI=mongodb://localhost:27017/cubevision
PORT=8000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
JWT_SECRET=change_this_to_a_long_random_secret
JWT_EXPIRES_IN=7d
```

### 3. Frontend
Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173`.

## How photo detection works now

1. Each uploaded face is center-cropped and resized.
2. The app samples the center of each of the 9 stickers.
3. The center sticker of each uploaded face becomes the color reference for that face.
4. Every sticker is matched to the closest center reference using CIE Lab color distance.
5. If the detected cube is invalid, the result is still shown so you can correct it manually.

For best detection: keep the face flat, fill the frame, avoid glare, and keep fingers away from stickers.

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Create account and return JWT |
| POST | `/api/auth/login` | No | Login and return JWT |
| GET | `/api/auth/me` | Yes | Current user profile and stats |
| POST | `/api/upload` | No | Upload 6 face images |
| POST | `/api/solve` | Optional | Solve cube state; saves to account if JWT is present |
| POST | `/api/solve/validate` | No | Validate cube state only |
| GET | `/api/history` | Yes | Current user's solve history |
| DELETE | `/api/history/:id` | Yes | Delete one current-user record |
| GET | `/api/stats` | Yes | Current user's statistics |

## Tests

```bash
cd backend
npm test

cd ../frontend
npm run build
```

