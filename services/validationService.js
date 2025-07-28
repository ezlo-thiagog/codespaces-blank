/**
 * Service for validation operations
 */
class ValidationService {
  /**
   * Validates serial number input and returns validation result
   * @param {string} text - The input text containing serial number(s)
   * @returns {Object} Validation result with success flag, serial, and error message
   */
  static validateSerialNumber(text) {
    // Check if text is provided
    if (!text || !text.trim()) {
      return {
        success: false,
        error: "❌ Please provide a serial number."
      };
    }

    let cleanedText = text.trim()
    .replace(/[\*_`~]/g, '') // Remove asterisks, underscores, backticks, tildes
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown **text**
    .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown *text*
    .replace(/_(.*?)_/g, '$1') // Remove italic markdown _text_
    .replace(/`(.*?)`/g, '$1') // Remove code markdown `text`
    .trim();

    // Extract serials (split by whitespace)
    const serials = cleanedText.trim().split(/\s+/);
    
    // Check for multiple serials
    if (serials.length > 1) {
      return {
        success: false,
        error: "❌ Please provide only a single serial number (e.g., 92000000)."
      };
    }

    const serial = serials[0];
    
    // Validate serial: must be exactly 8 digits, start with 92
    const serialPattern = /^92\d{6}$/;
    if (!serialPattern.test(serial)) {
      return {
        success: false,
        error: "❌ Invalid serial number format. Please provide an 8-digit serial starting with 92 (e.g., 92000000)."
      };
    }

    return {
      success: true,
      serial: serial
    };
  }

  /**
   * Validates channel access
   * @param {string} channel_id - The channel ID to validate
   * @param {Array<string>} allowedChannels - Array of allowed channel IDs
   * @returns {Object} Validation result with success flag and error message
   */
  static validateChannelAccess(channel_id, allowedChannels) {
    if (!allowedChannels.includes(channel_id)) {
      return {
        success: false,
        error: "❌ This command is not allowed in this channel."
      };
    }
    
    return {
      success: true
    };
  }
}

module.exports = ValidationService;