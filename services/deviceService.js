const EzloService = require('./ezloService');
const ValidationService = require('./validationService');

/**
 * Service for device-related operations combining validation and Ezlo API calls
 */
class DeviceService {
  constructor(config) {
    this.config = config;
    this.ezloService = new EzloService(config);
  }

  /**
   * Validates serial number and converts it to UUID
   * @param {string} text - The input text containing serial number
   * @param {string} token - Authentication token
   * @returns {Promise<Object>} Combined validation and conversion result
   */
  async validateAndConvertSerial(text, token) {
    // First validate the serial number
    const validation = ValidationService.validateSerialNumber(text);
    if (!validation.success) {
      return validation; // Return validation error
    }

    // Then convert to UUID
    const conversion = await this.ezloService.serialToUUID(validation.serial, token);
    if (!conversion.success) {
      return conversion; // Return conversion error
    }

    return {
      success: true,
      serial: validation.serial,
      uuid: conversion.uuid
    };
  }

  /**
   * Generates Metabase URL for a given serial number
   * @param {string} serial - The validated serial number
   * @returns {string} The generated Metabase URL
   */
  generateMetabaseUrl(serial) {
    return `${this.config.METABASE_BASE_URL}?serial_number=${encodeURIComponent(serial)}`;
  }

  /**
   * Processes device lookup request
   * @param {string} text - The input text containing serial number
   * @returns {Object} Processing result with success flag, URL, and error message
   */
  processDeviceLookup(text) {
    // Validate the serial number
    const validation = ValidationService.validateSerialNumber(text);
    if (!validation.success) {
      return validation;
    }

    const serial = validation.serial;
    const metabaseUrl = this.generateMetabaseUrl(serial);
    
    console.log(`Generated URL for serial ${serial}: ${metabaseUrl}`);
    
    return {
      success: true,
      serial: serial,
      url: metabaseUrl,
      message: `🔗 <${metabaseUrl}|View dashboard for ${serial}>`
    };
  }


  /**
   * Processes snapshot request for a device
   * @param {string} text - The input text containing serial number
   * @returns {Promise<Object>} Processing result with success flag and message
   */
  async processWebrtcStatusRequest(text) {
    // First login to get token
    const loginResult = await this.ezloService.login();
    if (!loginResult.success) {
      return {
        success: false,
        error: `❌ Authentication failed: ${loginResult.error}`
      };
    }

    // Validate serial and convert to UUID
    const result = await this.validateAndConvertSerial(text, loginResult.token);
    if (!result.success) {
      return result;
    }

    console.log(`Processing snapshot request for serial: ${result.serial}, UUID: ${result.uuid}`);
    
    const snapshotResult = await this.ezloService.getWebrtcStatus(result.uuid, loginResult.token);
    if (!snapshotResult.success) { 
      return {
        success: false,
        error: `❌ Snapshot request failed: ${snapshotResult.error}`
      };
    } 
    // Assuming snapshot result contains the necessary data
    console.log(`Snapshot request processed for serial ${result.serial} (UUID: ${result.uuid})`);
    console.log("Snapshot result:", snapshotResult);
    return snapshotResult;
  }

  /**
   * Constructs the output message for whether controller works with doorbell or not 
   * @param {string} serial - The validated serial number
   * @param {payload} payload
   */
  getControllerStatusMessage(payload, serial) {
    const { webrtcV2 } = payload;
    const { exists, status } = webrtcV2;

    // Check if WebRTC v2 doesn't exist
    if (!exists) {
      return `Controller with serial number ${serial} is NOT running correct FW and packages to work with doorbell. Reason: WebRTC v2 is not installed`;
    }

    // Check if WebRTC v2 exists but is off
    if (exists && status === 'off') {
      return `Controller with serial number ${serial} is NOT running correct FW and packages to work with doorbell. Reason: WebRTC v2 is off`;
    }

    // WebRTC v2 exists and is on (or null/undefined defaults to working)
    return `Controller with serial number ${serial} is running correct FW and packages to work with doorbell. Reason: WebRTC v2 is installed and on`;
  }
}

module.exports = DeviceService;