require("dotenv").config();
const express = require("express");
const { neon } = require("@neondatabase/serverless");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "maharaja-travels-secret-123";

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(process.cwd()));
app.use("/pages", express.static(path.join(process.cwd(), "pages")));
app.use("/assets", express.static(path.join(process.cwd(), "assets")));

// Root handler
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "index.html"));
});

// Neon Database Setup
const sql = neon(process.env.DATABASE_URL);

// --- Security Middleware ---

/**
 * Middleware to verify custom JWT token
 */
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No authentication token provided" });
  }

  const token = authHeader.split(" ")[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Contains id and email
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired session" });
  }
};

// --- Auth Endpoints ---

// Register
app.post("/api/auth/register", async (req, res) => {
  const { email, password, name } = req.body;

  try {
    // Check if user exists
    const [existingUser] = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    await sql`
      INSERT INTO users (full_name, email, password_hash)
      VALUES (${name}, ${email}, ${hashedPassword})
    `;

    res.json({ message: "Registration successful" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [user] = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Create JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.full_name },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful",
      session: { access_token: token }, // Format for compatibility with frontend
      user: {
        email: user.email,
        id: user.id,
        user_metadata: { full_name: user.full_name }
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});

// --- Booking Endpoints ---

/**
 * Add a booking (Authenticated)
 */
app.post("/api/bookings", authenticateUser, async (req, res) => {
  const booking = req.body;
  const userEmail = req.user.email;

  try {
    await sql`
      INSERT INTO bookings (id, name, email, package, travelers, total, date, status, user_email, payment_id, method)
      VALUES (
        ${booking.id}, ${booking.name}, ${booking.email}, ${booking.package}, 
        ${parseInt(booking.travelers)}, ${booking.total}, ${booking.date}, 
        ${booking.status}, ${userEmail}, ${booking.paymentId}, ${booking.method}
      )
    `;
    res.json({ message: "Booking saved successfully" });
  } catch (err) {
    console.error("Booking save error:", err);
    res.status(500).json({ error: "Failed to save booking" });
  }
});

/**
 * Get bookings for the authenticated user only
 */
app.get("/api/bookings", authenticateUser, async (req, res) => {
  const userEmail = req.user.email;

  try {
    const data = await sql`
      SELECT * FROM bookings 
      WHERE user_email = ${userEmail} 
      ORDER BY created_at DESC
    `;
    res.json(data);
  } catch (err) {
    console.error("Booking fetch error:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// --- Netlify/Serverless Support ---
const serverless = require("serverless-http");
module.exports = app;
module.exports.handler = serverless(app);

// Local development
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}
