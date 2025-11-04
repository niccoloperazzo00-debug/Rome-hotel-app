// backend/db/pool.js - Configured for Render PostgreSQL and Local Development
const { Pool } = require("pg");
require("dotenv").config();

// Use Render's DATABASE_URL environment variable (or fallback to individual vars)
const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'rome_hotels'}`;

// Render PostgreSQL requires SSL - detect if DATABASE_URL is set (Render provides this)
// Local development typically doesn't need SSL
const isRender = !!process.env.DATABASE_URL || process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: connectionString,
  // Render PostgreSQL requires SSL
  ssl: isRender ? { rejectUnauthorized: false } : false,
});

// Test connection
pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("❌ Database connection error:", err);
});

module.exports = pool;
