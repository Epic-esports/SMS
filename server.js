const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Render expects the app to listen on PORT and bind publicly.
const PORT = process.env.PORT || 10000;
const API_TOKEN = process.env.API_TOKEN || "change-this-token";
const FORWARD_WEBHOOK_URL = process.env.FORWARD_WEBHOOK_URL || "";

// Built-in memory store for testing.
// Replace later with a database like PostgreSQL, Firebase, or MongoDB.
const receivedMessages = [];

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "SMS Forward API is running"
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Simple auth middleware
function checkToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const tokenFromHeader = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  const tokenFromBody = req.body?.token || null;
  const providedToken = tokenFromHeader || tokenFromBody;

  if (!providedToken || providedToken !== API_TOKEN) {
    return res.status(401).json({
      ok: false,
      error: "Unauthorized"
    });
  }

  next();
}

// Main endpoint for Android app
app.post("/api/sms", checkToken, async (req, res) => {
  try {
    const {
      from,
      message,
      deviceName,
      simSlot,
      receivedAt
    } = req.body;

    if (!from || !message) {
      return res.status(400).json({
        ok: false,
        error: "Missing required fields: from, message"
      });
    }

    const smsData = {
      id: Date.now().toString(),
      from,
      message,
      deviceName: deviceName || "Unknown Device",
      simSlot: simSlot ?? null,
      receivedAt: receivedAt || new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    receivedMessages.unshift(smsData);

    console.log("New SMS received:");
    console.log(JSON.stringify(smsData, null, 2));

    // Optional: later you can forward to another API/webhook from here
    if (FORWARD_WEBHOOK_URL) {
      console.log(`FORWARD_WEBHOOK_URL is set: ${FORWARD_WEBHOOK_URL}`);
      // You can add fetch() forwarding here later if needed
    }

    return res.status(200).json({
      ok: true,
      message: "SMS received successfully",
      data: smsData
    });
  } catch (error) {
    console.error("Error receiving SMS:", error);
    return res.status(500).json({
      ok: false,
      error: "Internal server error"
    });
  }
});

// View last received messages
app.get("/api/messages", checkToken, (req, res) => {
  res.json({
    ok: true,
    count: receivedMessages.length,
    messages: receivedMessages
  });
});

// Clear messages
app.delete("/api/messages", checkToken, (req, res) => {
  receivedMessages.length = 0;
  res.json({
    ok: true,
    message: "All messages cleared"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
