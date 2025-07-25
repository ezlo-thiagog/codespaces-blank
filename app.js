const express = require("express");
const CONFIG = require("./config");
const DeviceService = require("./services/deviceService");
const ValidationService = require("./services/validationService");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const PORT = process.env.PORT || 3000;

// Initialize services
const deviceService = new DeviceService(CONFIG);

app.post("/", (req, res) => {
  try {
    console.log("Received request:", req.body);
    const { channel_id, text } = req.body;
    
    // Validate channel access
    const channelValidation = ValidationService.validateChannelAccess(channel_id, CONFIG.ALLOWED_CHANNELS);
    if (!channelValidation.success) {
      console.log(`Blocked request from channel: ${channel_id}`);
      return res.json({
        response_type: "ephemeral",
        text: channelValidation.error,
      });
    }

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
    
    // Validate channel access
    const channelValidation = ValidationService.validateChannelAccess(channel_id, CONFIG.ALLOWED_CHANNELS);
    if (!channelValidation.success) {
      console.log(`Blocked snapshot request from channel: ${channel_id}`);
      return res.json({
        response_type: "ephemeral",
        text: channelValidation.error,
      });
    }

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
      console.log(`Responding to thread with timestamp: ${thread_ts}`);
      return res.json({
        response_type: "in_channel", // or "ephemeral" if you want it private
        text: result.message,
        thread_ts: thread_ts // This will make the response appear in the thread
      });
    } else {
      // Regular response (not in a thread)
      console.log("Responding to channel (not in thread)");
      return res.json({
        response_type: "ephemeral",
        text: result.message,
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