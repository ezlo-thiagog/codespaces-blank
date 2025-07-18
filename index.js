const express = require("express");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Allowed Slack channel IDs
const ALLOWED_CHANNELS = ["C04SM9CP4F2", "C07KG1EU83H"];

app.post("/", (req, res) => {
  try {
    console.log("Received request:", req.body);
    
    const channel_id = req.body.channel_id;
    const text = req.body.text;

    if (!ALLOWED_CHANNELS.includes(channel_id)) {
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

    const serial = text.trim();
    const metabaseUrl = `https://metabase.mios.com/public/question/a3c3b26f-1c43-48d4-9061-39dd872d1014?serial_number=${encodeURIComponent(serial)}`;

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
  console.log(`Server running on port ${PORT}`);
});
