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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;

const CLIENT_URL = (process.env.CLIENT_URL || "http://localhost:3000").replace(
  /\/+$/,
  "",
);

const API_BASE_URL = (
  process.env.API_BASE_URL || `http://localhost:${PORT}`
).replace(/\/+$/, "");

const PRODUCTION = process.env.NODE_ENV === "production";
const LINK_TICKET_TTL_MS = 2 * 60 * 1000;

// ==========================================
// ENVIRONMENT VALIDATION
// ==========================================

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is missing");
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters");
}

if (!process.env.OAUTH_SESSION_SECRET) {
  throw new Error("OAUTH_SESSION_SECRET is missing");
}

app.disable("x-powered-by");

if (PRODUCTION) {
  app.set("trust proxy", 1);
}

// ==========================================
// CORS CONFIGURATION
// ==========================================

const allowedOrigins = new Set([
  CLIENT_URL,
  "https://kindora-lime.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    try {
      const url = new URL(origin);

      const isKindoraPreview =
        url.protocol === "https:" &&
        url.hostname.startsWith("kindora-") &&
        url.hostname.endsWith(".vercel.app");

      if (isKindoraPreview) {
        return callback(null, true);
      }
    } catch {
      // Invalid origin.
    }

    console.warn("CORS blocked origin:", origin);
    return callback(null, false);
  },

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "20kb" }));

// ==========================================
// SESSION CONFIGURATION
// ==========================================

app.use(
  session({
    name: "kindora.oauth.sid",
    secret: process.env.OAUTH_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: PRODUCTION,
      sameSite: "lax",
      maxAge: 10 * 60 * 1000,
    },
  }),
);

app.use(passport.initialize());

// ==========================================
// DATABASE HELPERS
// ==========================================

let db;

const users = () => db.collection("users");
const events = () => db.collection("events");

const validEmail = (email) =>
  typeof email === "string" &&
  email.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar || "",
});

const makeToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );

const newCode = () => crypto.randomBytes(32).toString("base64url");

const hashCode = (code) =>
  crypto.createHash("sha256").update(code).digest("hex");

function redirectError(error) {
  const url = new URL("/auth/callback", CLIENT_URL);
  url.searchParams.set("error", error);
  return url.toString();
}

function isConfigured(provider) {
  const prefix = provider === "google" ? "GOOGLE" : "GITHUB";

  return Boolean(
    process.env[`${prefix}_CLIENT_ID`] &&
    process.env[`${prefix}_CLIENT_SECRET`],
  );
}

function isValidAvatar(avatar) {
  if (avatar === "") return true;

  if (typeof avatar !== "string" || avatar.length > 2048) {
    return false;
  }

  try {
    const url = new URL(avatar);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

// ==========================================
// JWT AUTHENTICATION
// ==========================================

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Please sign in to your Kindora account first.",
      });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (typeof payload.sub !== "string" || !ObjectId.isValid(payload.sub)) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    const user = await users().findOne({
      _id: new ObjectId(payload.sub),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Account not found",
      });
    }

    req.kindoraUser = user;
    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Your session is invalid or expired. Please sign in again.",
    });
  }
}

// ==========================================
// GOOGLE STRATEGY
// ==========================================

if (isConfigured("google")) {
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
          const email = profile.emails?.[0]?.value;

          const verified =
            profile._json?.email_verified === true ||
            profile._json?.email_verified === "true";

          if (!verified || !validEmail(email)) {
            return done(new Error("Google email is not verified"));
          }

          return done(null, {
            provider: "google",
            providerId: String(profile.id),
            email: email.trim().toLowerCase(),
            name: profile.displayName || email.split("@")[0],
            avatar: profile.photos?.[0]?.value || "",
          });
        } catch (error) {
          return done(error);
        }
      },
    ),
  );
}

// ==========================================
// GITHUB STRATEGY
// ==========================================

if (isConfigured("github")) {
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
            throw new Error("Could not retrieve GitHub email");
          }

          const emails = await response.json();

          const primary = emails.find((item) => item.primary && item.verified);

          if (!primary || !validEmail(primary.email)) {
            throw new Error("GitHub primary email is not verified");
          }

          return done(null, {
            provider: "github",
            providerId: String(profile.id),
            email: primary.email.trim().toLowerCase(),
            name:
              profile.displayName ||
              profile.username ||
              primary.email.split("@")[0],
            avatar: profile.photos?.[0]?.value || "",
          });
        } catch (error) {
          return done(error);
        }
      },
    ),
  );
}

// ==========================================
// OAUTH HELPERS
// ==========================================

function startOAuth(provider) {
  return (req, res, next) => {
    if (!isConfigured(provider)) {
      return res.redirect(redirectError("oauth_not_configured"));
    }

    delete req.session.oauthLinkUserId;
    delete req.session.oauthLinkProvider;

    req.session.save((error) => {
      if (error) return next(error);

      passport.authenticate(provider, {
        session: false,
        scope: provider === "google" ? ["profile", "email"] : ["user:email"],
      })(req, res, next);
    });
  };
}

async function createOAuthCode(user) {
  const code = newCode();
  const now = new Date();

  await db.collection("oauth_codes").insertOne({
    codeHash: hashCode(code),
    userId: user._id,
    createdAt: now,
    expiresAt: new Date(now.getTime() + 2 * 60 * 1000),
  });

  return code;
}

function oauthCallback(provider) {
  return (req, res, next) => {
    if (!isConfigured(provider)) {
      return res.redirect(redirectError("oauth_not_configured"));
    }

    passport.authenticate(
      provider,
      { session: false },
      async (error, identity) => {
        try {
          if (error || !identity) {
            console.error(
              `${provider} OAuth failed:`,
              error?.message || "No profile",
            );

            return res.redirect(redirectError("oauth_login_failed"));
          }

          if (!db) {
            return res.redirect(redirectError("database_unavailable"));
          }

          const providerField = provider === "google" ? "googleId" : "githubId";

          const linkUserId = req.session?.oauthLinkUserId;
          const linkProvider = req.session?.oauthLinkProvider;

          // ======================================
          // ACCOUNT LINKING MODE
          // ======================================

          if (linkUserId && linkProvider === provider) {
            if (!ObjectId.isValid(linkUserId)) {
              return res.redirect(redirectError("link_account_not_found"));
            }

            const targetId = new ObjectId(linkUserId);

            const targetUser = await users().findOne({
              _id: targetId,
            });

            if (!targetUser) {
              return res.redirect(redirectError("link_account_not_found"));
            }

            if (targetUser.email.toLowerCase() !== identity.email) {
              return res.redirect(redirectError("link_email_mismatch"));
            }

            const alreadyLinked = await users().findOne({
              [providerField]: identity.providerId,
            });

            if (alreadyLinked && !alreadyLinked._id.equals(targetId)) {
              return res.redirect(redirectError("provider_already_linked"));
            }

            if (
              targetUser[providerField] &&
              targetUser[providerField] !== identity.providerId
            ) {
              return res.redirect(
                redirectError("another_provider_already_linked"),
              );
            }

            await users().updateOne(
              { _id: targetId },
              {
                $set: {
                  [providerField]: identity.providerId,
                  [`${provider}LinkedAt`]: new Date(),
                },
              },
            );

            delete req.session.oauthLinkUserId;
            delete req.session.oauthLinkProvider;

            return req.session.save((saveError) => {
              if (saveError) {
                return res.redirect(redirectError("link_session_failed"));
              }

              return res.redirect(
                `${CLIENT_URL}/auth/callback?linked=${encodeURIComponent(provider)}`,
              );
            });
          }

          // ======================================
          // LOGIN MODE
          // ======================================

          let user = await users().findOne({
            [providerField]: identity.providerId,
          });

          if (!user) {
            const existingEmail = await users().findOne({
              email: identity.email,
            });

            if (existingEmail) {
              return res.redirect(
                redirectError("account_exists_sign_in_and_link"),
              );
            }

            const created = {
              name: String(identity.name || identity.email.split("@")[0]).slice(
                0,
                80,
              ),
              email: identity.email,
              avatar: isValidAvatar(identity.avatar) ? identity.avatar : "",
              password: null,
              [providerField]: identity.providerId,
              createdAt: new Date(),
            };

            const result = await users().insertOne(created);

            user = {
              ...created,
              _id: result.insertedId,
            };
          }

          const code = await createOAuthCode(user);

          const url = new URL("/auth/callback", CLIENT_URL);
          url.searchParams.set("code", code);

          return res.redirect(url.toString());
        } catch (callbackError) {
          console.error(`${provider} callback error:`, callbackError.message);

          return res.redirect(
            redirectError(
              callbackError.code === 11000
                ? "account_already_exists"
                : "oauth_callback_failed",
            ),
          );
        }
      },
    )(req, res, next);
  };
}

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Kindora API is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    database: db ? "connected" : "disconnected",
  });
});

// ==========================================
// REGISTER
// ==========================================

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body ?? {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (
      cleanName.length < 2 ||
      cleanName.length > 80 ||
      !validEmail(cleanEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please check your name and email",
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must be 8–72 characters",
      });
    }

    const existing = await users().findOne({
      email: cleanEmail,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const record = {
      name: cleanName,
      email: cleanEmail,
      avatar: "",
      password: await bcrypt.hash(password, 12),
      createdAt: new Date(),
    };

    const result = await users().insertOne(record);

    const user = {
      _id: result.insertedId,
      name: record.name,
      email: record.email,
      avatar: record.avatar,
    };

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token: makeToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
});

// ==========================================
// EMAIL / PASSWORD LOGIN
// ==========================================

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await users().findOne({
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

    return res.json({
      success: true,
      message: "Login successful",
      token: makeToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

// ==========================================
// OAUTH LOGIN ROUTES
// ==========================================

app.get("/api/auth/google", startOAuth("google"));
app.get("/api/auth/google/callback", oauthCallback("google"));

app.get("/api/auth/github", startOAuth("github"));
app.get("/api/auth/github/callback", oauthCallback("github"));

// ==========================================
// GOOGLE ACCOUNT-LINK TICKET
// ==========================================

app.post("/api/auth/google/link-ticket", requireAuth, async (req, res) => {
  try {
    if (!isConfigured("google")) {
      return res.status(503).json({
        success: false,
        message: "Google OAuth is not configured",
      });
    }

    const ticket = newCode();
    const now = new Date();

    await db.collection("oauth_link_tickets").insertOne({
      codeHash: hashCode(ticket),
      userId: req.kindoraUser._id,
      provider: "google",
      createdAt: now,
      expiresAt: new Date(now.getTime() + LINK_TICKET_TTL_MS),
    });

    res.set("Cache-Control", "no-store");
    res.set("Referrer-Policy", "no-referrer");

    return res.json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error("Link ticket error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not start Google account linking",
    });
  }
});

// ==========================================
// GOOGLE ACCOUNT-LINK ROUTE
// ==========================================

app.get("/api/auth/google/link", async (req, res, next) => {
  try {
    const ticket = req.query.ticket;

    if (
      typeof ticket !== "string" ||
      ticket.length < 32 ||
      ticket.length > 200
    ) {
      return res.redirect(redirectError("invalid_link_ticket"));
    }

    if (!isConfigured("google")) {
      return res.redirect(redirectError("oauth_not_configured"));
    }

    const ticketRecord = await db
      .collection("oauth_link_tickets")
      .findOneAndDelete({
        codeHash: hashCode(ticket),
        provider: "google",
        expiresAt: { $gt: new Date() },
      });

    const record = ticketRecord?.value ?? ticketRecord;

    if (!record?.userId) {
      return res.redirect(redirectError("invalid_link_ticket"));
    }

    req.session.oauthLinkUserId = record.userId.toString();
    req.session.oauthLinkProvider = "google";

    req.session.save((error) => {
      if (error) return next(error);

      passport.authenticate("google", {
        session: false,
        scope: ["profile", "email"],
      })(req, res, next);
    });
  } catch (error) {
    console.error("Google link start error:", error.message);

    return res.redirect(redirectError("link_start_failed"));
  }
});

// ==========================================
// OAUTH CODE EXCHANGE
// ==========================================

app.post("/api/auth/oauth/exchange", async (req, res) => {
  try {
    const { code } = req.body ?? {};

    if (typeof code !== "string" || code.length < 32 || code.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired sign-in code",
      });
    }

    const result = await db.collection("oauth_codes").findOneAndDelete({
      codeHash: hashCode(code),
      expiresAt: { $gt: new Date() },
    });

    const record = result?.value ?? result;

    if (!record?.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired sign-in code",
      });
    }

    const userId =
      record.userId instanceof ObjectId
        ? record.userId
        : new ObjectId(record.userId);

    const user = await users().findOne({
      _id: userId,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Account not found",
      });
    }

    return res.json({
      success: true,
      token: makeToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("OAuth exchange error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not complete sign-in",
    });
  }
});

// ==========================================
// PROFILE - GET CURRENT USER
// ==========================================

app.get("/api/users/me", requireAuth, async (req, res) => {
  try {
    return res.json({
      success: true,
      user: publicUser(req.kindoraUser),
    });
  } catch (error) {
    console.error("Profile fetch error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
});

// ==========================================
// PROFILE - UPDATE CURRENT USER
// ==========================================

app.put("/api/users/me", requireAuth, async (req, res) => {
  try {
    const { name, avatar } = req.body ?? {};

    if (typeof name !== "string") {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const cleanName = name.trim();

    if (cleanName.length < 2 || cleanName.length > 80) {
      return res.status(400).json({
        success: false,
        message: "Name must be between 2 and 80 characters",
      });
    }

    if (avatar !== undefined && !isValidAvatar(avatar)) {
      return res.status(400).json({
        success: false,
        message: "Avatar must be an empty string or a valid HTTPS image URL",
      });
    }

    const update = {
      name: cleanName,
      updatedAt: new Date(),
    };

    if (avatar !== undefined) {
      update.avatar = avatar;
    }

    await users().updateOne({ _id: req.kindoraUser._id }, { $set: update });

    const updatedUser = await users().findOne({
      _id: req.kindoraUser._id,
    });

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: publicUser(updatedUser),
    });
  } catch (error) {
    console.error("Profile update error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
});

// ==========================================
// EVENTS - GET ALL
// ==========================================

app.get("/api/events", async (req, res) => {
  try {
    const eventList = await events().find({}).sort({ _id: -1 }).toArray();

    return res.json({
      success: true,
      count: eventList.length,
      events: eventList,
    });
  } catch (error) {
    console.error("Fetch events error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch events",
    });
  }
});

// ==========================================
// EVENTS - CREATE (AUTH REQUIRED)
// ==========================================

app.post("/api/events", requireAuth, async (req, res) => {
  try {
    const { title, type, location, date, image, description } = req.body ?? {};

    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 120 ||
      typeof type !== "string" ||
      !type.trim() ||
      typeof location !== "string" ||
      !location.trim() ||
      location.trim().length > 200 ||
      typeof date !== "string" ||
      !date.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid title, type, location and date",
      });
    }

    if (
      image !== undefined &&
      (typeof image !== "string" || image.length > 2048)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid event image URL",
      });
    }

    if (image && !isValidAvatar(image)) {
      return res.status(400).json({
        success: false,
        message: "Event image must be a valid HTTPS URL",
      });
    }

    if (
      description !== undefined &&
      (typeof description !== "string" || description.length > 2000)
    ) {
      return res.status(400).json({
        success: false,
        message: "Description must be under 2000 characters",
      });
    }

    const event = {
      title: title.trim(),
      type: type.trim(),
      location: location.trim(),
      date: date.trim(),
      image: image || "",
      description: description || "",
      ownerId: req.kindoraUser._id,
      createdAt: new Date(),
    };

    const result = await events().insertOne(event);

    return res.status(201).json({
      success: true,
      message: "Event created successfully",
      event: {
        _id: result.insertedId,
        ...event,
      },
    });
  } catch (error) {
    console.error("Create event error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create event",
    });
  }
});

// ==========================================
// EVENTS - UPDATE (OWNER ONLY)
// ==========================================

app.put("/api/events/:id", requireAuth, async (req, res) => {
  try {
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
      title.trim().length > 120 ||
      typeof type !== "string" ||
      !type.trim() ||
      typeof location !== "string" ||
      !location.trim() ||
      location.trim().length > 200 ||
      typeof date !== "string" ||
      !date.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid title, type, location and date",
      });
    }

    if (
      image !== undefined &&
      (typeof image !== "string" || image.length > 2048)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid event image URL",
      });
    }

    if (image && !isValidAvatar(image)) {
      return res.status(400).json({
        success: false,
        message: "Event image must be a valid HTTPS URL",
      });
    }

    if (
      description !== undefined &&
      (typeof description !== "string" || description.length > 2000)
    ) {
      return res.status(400).json({
        success: false,
        message: "Description must be under 2000 characters",
      });
    }

    const eventId = new ObjectId(id);

    const existingEvent = await events().findOne({
      _id: eventId,
    });

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (
      !existingEvent.ownerId ||
      !existingEvent.ownerId.equals(req.kindoraUser._id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to edit this event",
      });
    }

    await events().updateOne(
      {
        _id: eventId,
        ownerId: req.kindoraUser._id,
      },
      {
        $set: {
          title: title.trim(),
          type: type.trim(),
          location: location.trim(),
          date: date.trim(),
          image: image || "",
          description: description || "",
          updatedAt: new Date(),
        },
      },
    );

    const updatedEvent = await events().findOne({
      _id: eventId,
    });

    return res.json({
      success: true,
      message: "Event updated successfully",
      event: updatedEvent,
    });
  } catch (error) {
    console.error("Update event error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update event",
    });
  }
});

// ==========================================
// EVENTS - DELETE (OWNER ONLY)
// ==========================================

app.delete("/api/events/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    const eventId = new ObjectId(id);

    const existingEvent = await events().findOne({
      _id: eventId,
    });

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (
      !existingEvent.ownerId ||
      !existingEvent.ownerId.equals(req.kindoraUser._id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this event",
      });
    }

    await events().deleteOne({
      _id: eventId,
      ownerId: req.kindoraUser._id,
    });

    return res.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Delete event error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete event",
    });
  }
});

// ==========================================
// NEWSLETTER SUBSCRIBE
// ==========================================

app.post("/api/newsletter/subscribe", async (req, res) => {
  try {
    const { email } = req.body ?? {};

    if (typeof email !== "string" || !validEmail(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email",
      });
    }

    await db.collection("newsletter_subscribers").insertOne({
      email: email.trim().toLowerCase(),
      subscribedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Successfully subscribed!",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This email is already subscribed",
      });
    }

    console.error("Newsletter error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Subscription failed",
    });
  }
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use((error, req, res, next) => {
  console.error("Request error:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred",
  });
});

// ==========================================
// START SERVER
// ==========================================

async function startServer() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();

    db = client.db("kindora");

    await db.command({ ping: 1 });

    // User indexes.
    await users().createIndex({ email: 1 }, { unique: true });

    await users().createIndex({ googleId: 1 }, { unique: true, sparse: true });

    await users().createIndex({ githubId: 1 }, { unique: true, sparse: true });

    // Event indexes.
    await events().createIndex({ ownerId: 1 });
    await events().createIndex({ createdAt: -1 });

    // Newsletter indexes.
    await db
      .collection("newsletter_subscribers")
      .createIndex({ email: 1 }, { unique: true });

    // OAuth sign-in code indexes.
    await db
      .collection("oauth_codes")
      .createIndex({ codeHash: 1 }, { unique: true });

    await db
      .collection("oauth_codes")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    // Account-link ticket indexes.
    await db
      .collection("oauth_link_tickets")
      .createIndex({ codeHash: 1 }, { unique: true });

    await db
      .collection("oauth_link_tickets")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    app.listen(PORT, "0.0.0.0", () => {
      console.log("MongoDB connected successfully!");
      console.log(`Kindora API running on port ${PORT}`);
      console.log(`OAuth callback base URL: ${API_BASE_URL}`);
      console.log("CORS configuration loaded successfully.");
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);

    await client.close().catch(() => {});
    process.exit(1);
  }
}

startServer();
