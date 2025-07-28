const axios = require("axios");

/**
 * Service for handling Ezlo API operations such as login, UUID conversion, snapshot retrieval, and device management
 * This service interacts with the Ezlo API to perform various operations related to devices.
 */
class EzloService {
  constructor(config) {
    this.config = config;
    this.apiUrl = 'https://api-cloud-bh247.ezlo.com/v1/request';
  }

  /**
   * Performs login to Ezlo API and returns authentication token
   * @returns {Promise<Object>} Login result with success flag, token, and error message
   */
  async login() {
    try {
      const response = await axios.post(this.apiUrl, {
        call: "login_with_id_and_password",
        params: {
          user_id: this.config.EZLO_USER_ID,
          user_password: this.config.EZLO_USER_PASSWORD,
          oem_id: this.config.EZLO_OEM_ID
        }
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Check if login was successful
      if (response.data && response.data.status === 1 && response.data.complete === 1 && response.data.data && response.data.data.token) {
        console.log("Ezlo API login successful");
        return {
          success: true,
          token: response.data.data.token,
          legacyToken: response.data.data.legacy_token,
          expires: response.data.data.expires
        };
      } else {
        console.error("Login failed: Invalid response structure or status", response.data);
        return {
          success: false,
          error: `Login failed: ${response.data?.status === 0 ? 'Authentication rejected by server' : 'Invalid response from API'}`
        };
      }
    } catch (error) {
      console.error("Login error:", error.message);
      return {
        success: false,
        error: `Login failed: ${error.message}`
      };
    }
  }

  /**
   * Converts a serial number to UUID using Ezlo API legacy_id_mapping
   * @param {string} serial - The validated serial number
   * @param {string} token - Authentication token
   * @returns {Promise<Object>} Conversion result with success flag, UUID, and error message
   */
  async serialToUUID(serial, token) {
    try {
      const response = await axios.post(this.apiUrl, {
        call: "legacy_id_mapping",
        version: "1",
        params: {
          map: {
            controller: {
              ids_to_uuids: [serial]
            }
          }
        }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      // Check if conversion was successful
      // Enhanced validation with better error handling and logging
      if (response.data && response.data.status === 1 && response.data.complete === 1) {
        const controllerMapping = response.data.data?.map?.controller?.ids_to_uuids;
        
        // Log the mapping for debugging
        console.log("Controller mapping received:", controllerMapping);
        
        if (controllerMapping && typeof controllerMapping === 'object') {
          // Convert serial to string to ensure proper comparison
          const serialStr = String(serial);
          const uuid = controllerMapping[serialStr];
          
          if (uuid) {
            console.log(`Serial ${serial} converted to UUID: ${uuid}`);
            return {
              success: true,
              uuid: uuid,
              serial: serial
            };
          } else {
            console.error(`Serial ${serial} not found in controller mapping.`);
            console.error("Available serials:", Object.keys(controllerMapping));
            return {
              success: false,
              error: `Device with serial ${serial} not found or not accessible. Please check the serial number and try again.`
            };
          }
        } else {
          console.error("Controller mapping is missing or invalid:", response.data.data?.map?.controller);
          return {
            success: false,
            error: "Invalid response: controller mapping not found"
          };
        }
      } else {
        console.error("API response failed validation:", {
          status: response.data?.status,
          complete: response.data?.complete,
          hasData: !!response.data?.data
        });
        return {
          success: false,
          error: `API request failed: status=${response.data?.status}, complete=${response.data?.complete}`
        };
      }
    } catch (error) {
      console.error(`Error converting serial ${serial} to UUID:`, error.message);
      return {
        success: false,
        error: `UUID conversion failed: ${error.message}`
      };
    }
  }

  /**
   * Gets device webrtc status and existence using Ezlo API hub.features.list
   * @param {string} uuid - The UUID of the device
   * @param {string} token - Authentication token
   * @returns {Promise<Object>} Snapshot result with success flag, data, and error message
   */
  async getWebrtcStatus(uuid, token) {
    try {
      const response = await axios.post(this.apiUrl, {
        call: "controller_raw_command",
        params: {
          "controller_uuid": uuid,
          "instant" : 1,
          "queued" : 0,
          "instant_timeout" : 10,
          "command":{
            "method": "hub.features.list",
            "id": "_ID_",
            "params": {
          }

        }
      }
    }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Check if snapshot retrieval was successful
      if (response.data && response.data.status === 1 && response.data.complete === 1) {
        const features = response.data.data?.controller_response?.result?.features;
        let webrtcV2Status = null;
        let webrtcV2Exists = false;

        if (features && typeof features === 'object') {
          if ('mqttwebrtc.v2' in features) {
            webrtcV2Exists = true;
            webrtcV2Status = features['mqttwebrtc.v2'].status;
          }
        } else {
        console.error("Snapshot retrieval failed:", response.data);
        return {
          success: false,
          error: `Snapshot retrieval failed: ${response.data?.status === 0 ? 'Device not found or offline' : 'Invalid response from API'}`
        };
      }
        //return WebRCT status and existence
        console.log(`Webrtc status retrieved for UUID ${uuid}`);
        console.log("Webrtc V2 status:", webrtcV2Status, "Exists:", webrtcV2Exists);
        return {
          success: true,
          data: response.data.data,
          webrtcV2: {
            exists: webrtcV2Exists,
            status: webrtcV2Status
          }
        };
      } else {
        console.error("Snapshot retrieval failed:", response.data);
        return {
          success: false,
          error: `Snapshot retrieval failed: ${response.data?.status === 0 ? 'Device not found or not accessible' : 'Invalid response from API'}`
        };
      }
        
      } catch (error) {
        console.error(`Error retrieving webrtcstatus for UUID ${uuid}:`, error.message);
        return {
          success: false,
          error: `Snapshot retrieval failed: ${error.message}`
        };
      }
}
}
module.exports = EzloService;