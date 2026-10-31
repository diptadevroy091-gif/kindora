import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { MongoClient, ObjectId } from "mongodb";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
  }),
);

app.use(express.json({ limit: "20kb" }));

let db;

// =========================
// AUTH HELPERS
// =========================

function createToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );
}

// =========================
// HOME ROUTE
// =========================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Kindora API is running!",
  });
});

// =========================
// HEALTH CHECK
// =========================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "Kindora Server",
    status: "healthy",
    database: db ? "connected" : "disconnected",
  });
});

// =========================
// REGISTER
// POST /api/auth/register
// =========================

app.post("/api/auth/register", async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected",
      });
    }

    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2 || cleanName.length > 80) {
      return res.status(400).json({
        success: false,
        message: "Name must be between 2 and 80 characters",
      });
    }

    if (
      cleanEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 8 and 72 characters",
      });
    }

    const users = db.collection("users");

    const existingUser = await users.findOne({
      email: cleanEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = {
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      createdAt: new Date(),
    };

    const result = await users.insertOne(newUser);

    const user = {
      _id: result.insertedId,
      name: newUser.name,
      email: newUser.email,
    };

    const token = createToken(user);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    console.error("Registration failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
    });
  }
});

// =========================
// LOGIN
// POST /api/auth/login
// =========================

app.post("/api/auth/login", async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected",
      });
    }

    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await db.collection("users").findOne({
      email: cleanEmail,
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
    };

    const token = createToken(safeUser);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error("Login failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
});

// =========================
// GET ALL EVENTS
// =========================

app.get("/api/events", async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected",
      });
    }

    const events = await db
      .collection("events")
      .find({})
      .sort({ _id: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    console.error("Failed to fetch events:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch events",
    });
  }
});

// =========================
// CREATE EVENT
// =========================

app.post("/api/events", async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected",
      });
    }

    const { title, type, location, date, image, description } = req.body;

    if (!title || !type || !location || !date) {
      return res.status(400).json({
        success: false,
        message: "Title, type, location, and date are required",
      });
    }

    const newEvent = {
      title,
      type,
      location,
      date,
      image: image || "",
      description: description || "",
      createdAt: new Date(),
    };

    const result = await db.collection("events").insertOne(newEvent);

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      event: {
        _id: result.insertedId,
        ...newEvent,
      },
    });
  } catch (error) {
    console.error("Failed to create event:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to create event",
    });
  }
});

// =========================
// UPDATE EVENT
// =========================

app.put("/api/events/:id", async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected",
      });
    }

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    const { title, type, location, date, image, description } = req.body;

    if (!title || !type || !location || !date) {
      return res.status(400).json({
        success: false,
        message: "Title, type, location, and date are required",
      });
    }

    const updatedEvent = {
      title,
      type,
      location,
      date,
      image: image || "",
      description: description || "",
      updatedAt: new Date(),
    };

    const result = await db
      .collection("events")
      .updateOne({ _id: new ObjectId(id) }, { $set: updatedEvent });

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
    });
  } catch (error) {
    console.error("Failed to update event:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to update event",
    });
  }
});

// =========================
// DELETE EVENT
// =========================

app.delete("/api/events/:id", async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected",
      });
    }

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    const result = await db.collection("events").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete event:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to delete event",
    });
  }
});

// =========================
// START SERVER
// =========================

async function startServer() {
  let client;

  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error(
        "JWT_SECRET is missing or too short. Set a strong secret in .env",
      );
    }

    client = new MongoClient(process.env.MONGODB_URI);

    await client.connect();

    db = client.db("kindora");

    await db.command({ ping: 1 });

    // Enforce unique email addresses in MongoDB.
    await db.collection("users").createIndex({ email: 1 }, { unique: true });

    console.log("MongoDB connected successfully!");

    app.listen(PORT, () => {
      console.log(`Kindora API running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);

    if (client) {
      await client.close().catch(() => {});
    }

    process.exit(1);
  }
}

startServer();
