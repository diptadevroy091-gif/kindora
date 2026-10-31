import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import passport from "passport";
import session from "express-session";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { MongoClient, ObjectId } from "mongodb";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ==========================================
// ENVIRONMENT
// ==========================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;

const CLIENT_URL = (process.env.CLIENT_URL || "http://localhost:3000").replace(
  /\/+$/,
  "",
);

const API_BASE_URL = (
  process.env.API_BASE_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const IS_PRODUCTION = process.env.NODE_ENV === "production";

app.disable("x-powered-by");

if (IS_PRODUCTION) {
  app.set("trust proxy", 1);
}

// ==========================================
// VALIDATE ENVIRONMENT
// ==========================================

if (!process.env.OAUTH_SESSION_SECRET?.trim()) {
  console.error("Missing OAUTH_SESSION_SECRET.");
  process.exit(1);
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be at least 32 characters.");
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is missing.");
  process.exit(1);
}

// ==========================================
// MIDDLEWARE
// ==========================================

const allowedOrigins = new Set([
  CLIENT_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin is not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "20kb" }));

// OAuth session middleware
app.use(
  session({
    name: "kindora.oauth.sid",
    secret: process.env.OAUTH_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: "lax",
      maxAge: 10 * 60 * 1000,
    },
  }),
);

app.use(passport.initialize());

// ==========================================
// DATABASE
// ==========================================

let db;

const usersCollection = () => db.collection("users");

function validEmail(email) {
  return (
    typeof email === "string" &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

function publicUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
  };
}

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

function oauthConfigured(provider) {
  const prefix = provider === "google" ? "GOOGLE" : "GITHUB";

  return Boolean(
    process.env[`${prefix}_CLIENT_ID`] &&
    process.env[`${prefix}_CLIENT_SECRET`] &&
    process.env.OAUTH_SESSION_SECRET,
  );
}

function makeOAuthErrorRedirect(message) {
  const url = new URL("/auth/callback", CLIENT_URL);
  url.searchParams.set("error", message);
  return url.toString();
}

function createOneTimeCode() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashOneTimeCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

// ==========================================
// CREATE OR FIND OAUTH USER
// ==========================================

async function findOrCreateOAuthUser({ provider, providerId, email, name }) {
  if (!db) throw new Error("Database is not connected");
  if (!providerId) throw new Error("Provider ID is missing");
  if (!validEmail(email)) throw new Error("A valid email is required");

  const users = usersCollection();
  const providerField = provider === "google" ? "googleId" : "githubId";

  const linkedUser = await users.findOne({
    [providerField]: String(providerId),
  });

  if (linkedUser) return linkedUser;

  const cleanEmail = email.trim().toLowerCase();
  const existingUser = await users.findOne({ email: cleanEmail });

  if (existingUser) {
    throw new Error(
      "An account already uses this email. Sign in using your existing method.",
    );
  }

  const newUser = {
    name:
      typeof name === "string" && name.trim()
        ? name.trim().slice(0, 80)
        : cleanEmail.split("@")[0],
    email: cleanEmail,
    password: null,
    [providerField]: String(providerId),
    createdAt: new Date(),
  };

  const result = await users.insertOne(newUser);

  return { ...newUser, _id: result.insertedId };
}

// ==========================================
// GOOGLE OAUTH STRATEGY
// ==========================================

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    "google",
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${API_BASE_URL}/api/auth/google/callback`,
        scope: ["profile", "email"],
        state: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const verified =
            profile._json?.email_verified === true ||
            profile._json?.email_verified === "true";

          const email = profile.emails?.[0]?.value;

          if (!verified || !validEmail(email)) {
            return done(new Error("Use a verified Google email address."));
          }

          const user = await findOrCreateOAuthUser({
            provider: "google",
            providerId: profile.id,
            email,
            name: profile.displayName,
          });

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );
}

// ==========================================
// GITHUB OAUTH STRATEGY
// ==========================================

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    "github",
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${API_BASE_URL}/api/auth/github/callback`,
        scope: ["user:email"],
        state: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const response = await fetch("https://api.github.com/user/emails", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
            signal: AbortSignal.timeout(10000),
          });

          if (!response.ok) {
            throw new Error("Could not retrieve GitHub email.");
          }

          const emails = await response.json();

          const verifiedEmail = Array.isArray(emails)
            ? emails.find((item) => item.primary && item.verified)
            : null;

          if (!verifiedEmail || !validEmail(verifiedEmail.email)) {
            throw new Error(
              "GitHub requires a primary verified email address.",
            );
          }

          const user = await findOrCreateOAuthUser({
            provider: "github",
            providerId: profile.id,
            email: verifiedEmail.email,
            name: profile.displayName || profile.username,
          });

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );
}

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Kindora API is running!",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "Kindora Server",
    status: "healthy",
    database: db ? "connected" : "disconnected",
  });
});

// ==========================================
// REGISTER
// ==========================================

app.post("/api/auth/register", async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected",
      });
    }

    const { name, email, password } = req.body ?? {};

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

    if (!validEmail(cleanEmail)) {
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

    const users = usersCollection();
    const existing = await users.findOne({ email: cleanEmail });

    if (existing) {
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

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token: createToken(user),
      user,
    });
  } catch (error) {
    console.error("Registration failed:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
    });
  }
});

// ==========================================
// EMAIL/PASSWORD LOGIN
// ==========================================

app.post("/api/auth/login", async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected",
      });
    }

    const { email, password } = req.body ?? {};

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

    const user = await usersCollection().findOne({
      email: email.trim().toLowerCase(),
    });

    if (
      !user ||
      typeof user.password !== "string" ||
      !(await bcrypt.compare(password, user.password))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const safeUser = publicUser(user);

    return res.json({
      success: true,
      message: "Login successful",
      token: createToken(safeUser),
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

// ==========================================
// OAUTH START AND CALLBACK
// ==========================================

function oauthStart(provider) {
  return (req, res, next) => {
    if (!oauthConfigured(provider)) {
      return res
        .status(503)
        .send(`${provider} OAuth is not configured on the server.`);
    }

    const options = {
      session: false,
      scope: provider === "google" ? ["profile", "email"] : ["user:email"],
    };

    passport.authenticate(provider, options)(req, res, next);
  };
}

function oauthCallback(provider) {
  return (req, res, next) => {
    if (!oauthConfigured(provider)) {
      return res.redirect(makeOAuthErrorRedirect(`${provider}_not_configured`));
    }

    passport.authenticate(provider, { session: false }, async (error, user) => {
      try {
        if (error || !user) {
          console.error(
            `${provider} OAuth failed:`,
            error?.message || "No user returned",
          );

          return res.redirect(makeOAuthErrorRedirect("oauth_login_failed"));
        }

        if (!db) {
          return res.redirect(makeOAuthErrorRedirect("database_unavailable"));
        }

        const code = createOneTimeCode();
        const now = new Date();

        await db.collection("oauth_codes").insertOne({
          codeHash: hashOneTimeCode(code),
          userId: user._id,
          createdAt: now,
          expiresAt: new Date(now.getTime() + 2 * 60 * 1000),
        });

        const callbackURL = new URL("/auth/callback", CLIENT_URL);
        callbackURL.searchParams.set("code", code);

        return res.redirect(callbackURL.toString());
      } catch (callbackError) {
        console.error(`${provider} callback failed:`, callbackError.message);

        return res.redirect(makeOAuthErrorRedirect("oauth_callback_failed"));
      }
    })(req, res, next);
  };
}

app.get("/api/auth/google", oauthStart("google"));
app.get("/api/auth/google/callback", oauthCallback("google"));

app.get("/api/auth/github", oauthStart("github"));
app.get("/api/auth/github/callback", oauthCallback("github"));

// ==========================================
// EXCHANGE OAUTH ONE-TIME CODE
// ==========================================

app.post("/api/auth/oauth/exchange", async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected",
      });
    }

    const { code } = req.body ?? {};

    if (typeof code !== "string" || code.length < 32 || code.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired sign-in code",
      });
    }

    const result = await db.collection("oauth_codes").findOneAndDelete({
      codeHash: hashOneTimeCode(code),
      expiresAt: { $gt: new Date() },
    });

    const record = result?.value ?? result;

    if (!record?.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired sign-in code. Please try again.",
      });
    }

    const userId =
      record.userId instanceof ObjectId
        ? record.userId
        : new ObjectId(record.userId);

    const user = await usersCollection().findOne({ _id: userId });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Account not found. Please sign in again.",
      });
    }

    const safeUser = publicUser(user);

    return res.json({
      success: true,
      message: "OAuth login successful",
      token: createToken(safeUser),
      user: safeUser,
    });
  } catch (error) {
    console.error("OAuth exchange failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not complete sign in. Please try again.",
    });
  }
});

// ==========================================
// GET EVENTS
// ==========================================

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

    return res.json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    console.error("Fetch events failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch events",
    });
  }
});

// ==========================================
// CREATE EVENT
// ==========================================

app.post("/api/events", async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected",
      });
    }

    const { title, type, location, date, image, description } = req.body ?? {};

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof type !== "string" ||
      !type.trim() ||
      typeof location !== "string" ||
      !location.trim() ||
      !date
    ) {
      return res.status(400).json({
        success: false,
        message: "Title, type, location, and date are required",
      });
    }

    const event = {
      title: title.trim(),
      type: type.trim(),
      location: location.trim(),
      date,
      image: typeof image === "string" ? image : "",
      description: typeof description === "string" ? description : "",
      createdAt: new Date(),
    };

    const result = await db.collection("events").insertOne(event);

    return res.status(201).json({
      success: true,
      message: "Event created successfully",
      event: { _id: result.insertedId, ...event },
    });
  } catch (error) {
    console.error("Create event failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create event",
    });
  }
});

// ==========================================
// UPDATE EVENT
// ==========================================

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

    const { title, type, location, date, image, description } = req.body ?? {};

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof type !== "string" ||
      !type.trim() ||
      typeof location !== "string" ||
      !location.trim() ||
      !date
    ) {
      return res.status(400).json({
        success: false,
        message: "Title, type, location, and date are required",
      });
    }

    const updatedEvent = {
      title: title.trim(),
      type: type.trim(),
      location: location.trim(),
      date,
      image: typeof image === "string" ? image : "",
      description: typeof description === "string" ? description : "",
      updatedAt: new Date(),
    };

    const result = await db
      .collection("events")
      .updateOne({ _id: new ObjectId(id) }, { $set: updatedEvent });

    if (!result.matchedCount) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    return res.json({
      success: true,
      message: "Event updated successfully",
    });
  } catch (error) {
    console.error("Update event failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update event",
    });
  }
});

// ==========================================
// DELETE EVENT
// ==========================================

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

    if (!result.deletedCount) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    return res.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Delete event failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete event",
    });
  }
});

// ==========================================
// NEWSLETTER
// ==========================================

app.post("/api/newsletter/subscribe", async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected",
      });
    }

    const { email } = req.body ?? {};

    if (typeof email !== "string" || !validEmail(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    await db.collection("newsletter_subscribers").insertOne({
      email: cleanEmail,
      subscribedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Successfully subscribed! Thank you for joining Kindora.",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This email is already subscribed!",
      });
    }

    console.error("Newsletter subscription failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Subscription failed. Please try again.",
    });
  }
});

// ==========================================
// ERROR HANDLER
// ==========================================

app.use((error, req, res, next) => {
  console.error("Request error:", error.message);

  if (res.headersSent) return next(error);

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
  });
});

// ==========================================
// START SERVER
// ==========================================

async function startServer() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();

    const database = client.db("kindora");
    await database.command({ ping: 1 });
    db = database;

    await db.collection("users").createIndex({ email: 1 }, { unique: true });

    await db
      .collection("newsletter_subscribers")
      .createIndex({ email: 1 }, { unique: true });

    await db
      .collection("oauth_codes")
      .createIndex({ codeHash: 1 }, { unique: true });

    await db
      .collection("oauth_codes")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    app.listen(PORT, () => {
      console.log("MongoDB connected successfully!");
      console.log(`Kindora API running on port ${PORT}`);
      console.log(`OAuth callback base URL: ${API_BASE_URL}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    await client.close().catch(() => {});
    process.exit(1);
  }
}

startServer();
