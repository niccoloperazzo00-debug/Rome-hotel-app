# Local Development Setup

## Quick Start

1. **Create `.env` file** in the `backend/` folder with your local PostgreSQL credentials:

Create `backend/.env` with:
```
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rome_hotels
PORT=5000
NODE_ENV=development
```

Replace `your_password` with your actual PostgreSQL password.

2. **Make sure PostgreSQL is running** on your local machine

3. **Create the database** (if it doesn't exist):
```sql
CREATE DATABASE rome_hotels;
```

4. **Install backend dependencies** (if not already done):
```bash
cd backend
npm install
```

5. **Start the backend server**:
```bash
cd backend
npm start
```

You should see: `✅ Server running on port 5000`

6. **Access the application**:
   - Open your browser and go to: `http://localhost:5000`
   - The backend serves both the API and the frontend files
   - The config.js automatically uses `http://localhost:5000` when running locally

## Database Schema

The hotels table should have these columns:
- id (integer, primary key)
- hotel_name (text)
- latitude (numeric)
- longitude (numeric)
- star_rating (integer)
- municipio (text)
- status (text) - values: 'White', 'Green', 'Yellow', 'Red'
- phase (integer, nullable)
- notes (text, nullable)
- address (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)

## Testing Connection

Run the test script:
```bash
cd backend
node test-db.js
```

This will verify your database connection and check if the hotels table exists.

