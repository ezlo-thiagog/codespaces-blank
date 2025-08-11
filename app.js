const express = require("express");
const CONFIG = require("./config");
const DeviceService = require("./services/deviceService");
const ValidationService = require("./services/validationService");

const { WebClient } = require('@slack/web-api');

// Initialize Slack WebClient
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const PORT = process.env.PORT || 3000;

// Initialize services
const deviceService = new DeviceService(CONFIG);

// OAuth endpoint for Slack app installation
app.get('/slack/oauth/callback', async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    return res.status(400).send(`Installation failed: ${error}`);
  }
  
  try {
    // Exchange code for access token
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        code: code
      })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      res.send('✅ App installed successfully! You can now use /history and /snapshot commands.');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    res.status(500).send(`Installation failed: ${error.message}`);
  }
});

app.post("/", (req, res) => {
  try {
    console.log("Received request:", req.body);
    const { channel_id, text } = req.body;
  

    // Process device lookup
    const result = deviceService.processDeviceLookup(text);
    if (!result.success) {
      console.log("Device lookup failed:", result.error);
      return res.json({
        response_type: "ephemeral",
        text: result.error,
      });
    }

    return res.json({
      response_type: "ephemeral",
      text: result.message,
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

app.post("/snapshot", async (req, res) => {
  try {
    console.log("Received snapshot request:", req.body);
    const { channel_id, text, thread_ts } = req.body;
    
    /** Validate channel access
    const channelValidation = ValidationService.validateChannelAccess(channel_id, CONFIG.ALLOWED_CHANNELS);
    if (!channelValidation.success) {
      console.log(`Blocked snapshot request from channel: ${channel_id}`);
      return res.json({
        response_type: "ephemeral",
        text: channelValidation.error,
      });
    }
    **/
    // Process snapshot request
    const result = await deviceService.processWebrtcStatusRequest(text);
    if (!result.success) {
      console.log("Snapshot request failed:", result.error);
      return res.json({
        response_type: "ephemeral",
        text: result.error,
      });
    }

    // Construct message with WebRTC status if response contains success
    // response structure is { success: true, serial: string, uuid: string, message: string, webrtcV2: string }
    // Text should be "Controller with serial {serial} "
    const message = deviceService.getControllerStatusMessage(result, text);
    console.log("Snapshot request processed successfully:", message);
    result.message = message; // Update result with the constructed message

    // Check if this is from a thread
    if (thread_ts) {
      try {
        await slack.chat.postMessage({
          channel: channel_id,
          text: message,
          thread_ts: thread_ts
        });

        return res.json({
          response_type: "ephemeral",
          text: message
        });
      } catch (apiError) {
        console.error("Error posting to thread:", apiError);
        return res.json({
          response_type: "ephemeral",
          text: "❌ Failed to process request in thread. Please try again."
        });
      }
    } else {
      return res.json({
        response_type: "ephemeral",
        text: message,
      });
    }

  } catch (error) {
    console.error("Error processing snapshot request:", error);
    
    // Handle error response - also check for thread context
    const errorResponse = {
      response_type: "ephemeral",
      text: "❌ An error occurred while processing your snapshot request.",
    };
    
    // If we have thread_ts, include it in error response too
    if (req.body.thread_ts) {
      errorResponse.thread_ts = req.body.thread_ts;
    }
    
    return res.status(500).json(errorResponse);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});