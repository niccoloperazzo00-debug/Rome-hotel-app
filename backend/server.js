// backend/server.js - FIX THESE LINES:
const express = require("express");
const path = require("path");
const cors = require("cors");
const hotelsRoutes = require("./routes/hotels");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS MIDDLEWARE
// In production (Render), allow all origins since frontend is served from same domain
// In development, allow localhost origins
app.use(
  cors({
    origin: process.env.NODE_ENV === "production" 
      ? true // Allow all origins in production (frontend served from same domain)
      : [
          "http://127.0.0.1:5500",
          "http://localhost:5500",
          "http://localhost:3000",
          "http://localhost:5000",
        ],
    credentials: true,
  })
);

// Parse incoming JSON
app.use(express.json());

// ✅ FIX: Serve static files from the ROOT directory (where index.html is)
app.use(express.static(path.join(__dirname, "..")));

// API routes
app.use("/api/hotels", hotelsRoutes);

// ✅ FIX: Fallback for frontend routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
