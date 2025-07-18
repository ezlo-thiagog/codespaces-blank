const express = require("express");
const CONFIG = require("./config");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post("/", (req, res) => {
  try {
    console.log("Received request:", req.body);

    const channel_id = req.body.channel_id;
    const text = req.body.text;

    if (!CONFIG.ALLOWED_CHANNELS.includes(channel_id)) {
      console.log(`Blocked request from channel: ${channel_id}`);
      return res.json({
        response_type: "ephemeral",
        text: "❌ This command is not allowed in this channel.",
      });
    }

    if (!text || !text.trim()) {
      console.log("Empty text provided");
      return res.json({
        response_type: "ephemeral",
        text: "❌ Please provide a serial number.",
      });
    }

    // Extract serials (split by whitespace)
    const serials = text.trim().split(/\s+/);

    if (serials.length > 1) {
      console.log("Multiple serials provided. Please provide only one.");
      return res.json({
        response_type: "ephemeral",
        text: "❌ Please provide only a single serial number (e.g., 92000000).",
      });
    }

    const serial = serials[0];

    // Validate serial: must be exactly 8 digits, start with 92
    const serialPattern = /^92\d{6}$/;
    if (!serialPattern.test(serial)) {
      console.log("Invalid serial format:", serial);
      return res.json({
        response_type: "ephemeral",
        text: "❌ Invalid serial number format. Please provide an 8-digit serial starting with 92 (e.g., 92000000).",
      });
    }

    const metabaseUrl = `${CONFIG.METABASE_BASE_URL}?serial_number=${encodeURIComponent(serial)}`;
;

    console.log(`Generated URL for serial ${serial}: ${metabaseUrl}`);

    return res.json({
      response_type: "in_channel",
      text: `🔗 <${metabaseUrl}|View dashboard for ${serial}>`,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      response_type: "ephemeral",
      text: "❌ An error occurred while processing your request.",
    });
  }
});

app.get("/", (req, res) => {
  res.send("Slack bot is running ✅");
});

app.listen(PORT, () => {
  console.log(`Server is NOW running on port ${PORT}`);
});
