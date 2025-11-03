const pool = require("./db/pool");

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log("✅ Database connected successfully");

    // Test query
    const result = await client.query("SELECT NOW()");
    console.log("✅ Current database time:", result.rows[0].now);

    // Test hotels table query
    const hotelsResult = await client.query("SELECT COUNT(*) as count FROM hotels");
    console.log(`✅ Hotels table accessible - Total hotels: ${hotelsResult.rows[0].count}`);

    client.release();
    process.exit(0);
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
}

testConnection();
