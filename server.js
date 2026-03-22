require("dotenv").config();
const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(process.cwd()));
app.use("/pages", express.static(path.join(process.cwd(), "pages")));
app.use("/assets", express.static(path.join(process.cwd(), "assets")));

// Root handler to serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "index.html"));
});

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL: Supabase URL or Key missing in .env file");
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// --- Utility Functions ---

/**
 * Sanitize and validate string input
 * @param {any} value - Input value
 * @param {number} maxLength - Maximum allowed length
 * @param {string} defaultValue - Default value if input is invalid
 * @returns {string} Sanitized string
 */
function sanitizeString(value, maxLength = 100, defaultValue = '') {
  if (value === null || value === undefined) return defaultValue;
  return String(value).trim().substring(0, maxLength);
}

/**
 * Sanitize and validate number input
 * @param {any} value - Input value
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {number} defaultValue - Default value if input is invalid
 * @returns {number} Sanitized number
 */
function sanitizeNumber(value, min = 0, max = 1000, defaultValue = 0) {
  const num = parseInt(value) || defaultValue;
  return Math.min(Math.max(num, min), max);
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Middleware to verify Supabase JWT token and extract user
 */
const authenticateUser = async (req, res, next) => {
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No authentication token provided" });
  }

  const token = authHeader.split(" ")[1];
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    
    // Attach user to request object
    req.user = user;
    next();
  } catch (err) {
    console.error("Authentication middleware error:", err);
    res.status(500).json({ error: "Internal server error during authentication" });
  }
};

// --- Auth Endpoints ---

// Register
app.post("/api/auth/register", async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });
  
  const { email, password, name } = req.body;

  // Input validation
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Email, password, and name are required" });
  }

  const sanitizedEmail = sanitizeString(email, 254).toLowerCase();
  const sanitizedName = sanitizeString(name, 100);

  if (!isValidEmail(sanitizedEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long" });
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: sanitizedEmail,
      password,
      options: {
        data: { full_name: sanitizedName },
        emailRedirectTo: "https://mharajatravel.netlify.app/pages/login.html"
      },
    });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "Registration successful", user: data.user });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Internal server error during registration" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });
  
  const { email, password } = req.body;

  // Input validation
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const sanitizedEmail = sanitizeString(email, 254).toLowerCase();

  if (!isValidEmail(sanitizedEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: sanitizedEmail,
      password,
    });

    if (error) return res.status(400).json({ error: error.message });
    res.json({
      message: "Login successful",
      session: data.session,
      user: data.user,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error during login" });
  }
});

// --- Booking Endpoints ---

/**
 * Add a booking (Authenticated)
 */
app.post("/api/bookings", authenticateUser, async (req, res) => {
  const booking = req.body;
  
  // Security: Ensure user is only booking for themselves
  const userEmail = req.user.email;

  // Input validation and sanitization
  const sanitizedBooking = {
    id: sanitizeString(booking.id, 50),
    name: sanitizeString(booking.name, 100),
    email: userEmail, // Always use authenticated email
    package: sanitizeString(booking.package, 100),
    travelers: sanitizeNumber(booking.travelers, 1, 20, 1),
    total: sanitizeString(booking.total, 20),
    date: booking.date ? new Date(booking.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    status: sanitizeString(booking.status, 20, 'Pending'),
    user_email: userEmail,
    payment_id: sanitizeString(booking.paymentId, 50),
    method: sanitizeString(booking.method, 20),
  };

  try {
    const { data, error } = await supabase.from("bookings").insert([sanitizedBooking]);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "Booking saved successfully", data });
  } catch (err) {
    console.error("Booking creation error:", err);
    res.status(500).json({ error: "Internal server error during booking creation" });
  }
});

/**
 * Get bookings for the authenticated user only
 */
app.get("/api/bookings", authenticateUser, async (req, res) => {
  const userEmail = req.user.email;

  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_email", userEmail) // Strict filtering
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error("Booking retrieval error:", err);
    res.status(500).json({ error: "Internal server error during booking retrieval" });
  }
});

// For Vercel, we export the app
module.exports = app;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}
