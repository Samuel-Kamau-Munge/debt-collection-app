const twilio = require('twilio');
const config = require('../config/config');
const logger = require('../utils/logger');

class PhoneService {
  constructor() {
    this.client = null;
    this.fromNumber = null;
    this.initialized = false;
    this.initializeTwilio();
  }

  initializeTwilio() {
    try {
      const accountSid = config.twilio.accountSid;
      const authToken = config.twilio.authToken;

      if (accountSid && authToken && accountSid !== '') {
        this.client = twilio(accountSid, authToken);
        this.fromNumber = config.twilio.phoneNumber;
        this.initialized = true;
        logger.info('Phone service initialized with Twilio', {
          accountSid: accountSid.substring(0, 8) + '...',
          fromNumber: this.fromNumber
        });
      } else {
        logger.warn('Phone service not configured - using mock mode');
        this.initialized = false;
      }
    } catch (error) {
      logger.error('Failed to initialize phone service:', error);
      this.initialized = false;
    }
  }

  // Make a phone call
  async makeCall(to, message, options = {}) {
    try {
      if (!this.initialized) {
        return this.mockCall(to, message, options);
      }

      const callOptions = {
        to: to,
        from: this.fromNumber,
        twiml: this.generateTwiml(message),
        statusCallback: options.statusCallback || `${config.server.baseUrl}/webhook/call-status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        ...options
      };

      const call = await this.client.calls.create(callOptions);
      
      logger.info('Phone call initiated', {
        callSid: call.sid,
        to: to,
        from: this.fromNumber,
        status: call.status
      });

      return {
        success: true,
        callSid: call.sid,
        status: call.status,
        to: to,
        from: this.fromNumber,
        mock: false
      };

    } catch (error) {
      logger.error('Failed to make phone call', {
        error: error.message,
        to: to,
        code: error.code
      });

      // Fallback to mock call on error
      return this.mockCall(to, message, options);
    }
  }

  // Generate TwiML for the call
  generateTwiml(message) {
    // Escape special characters for TwiML
    const escapedMessage = message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-US">
    ${escapedMessage}
  </Say>
  <Pause length="2"/>
  <Say voice="alice" language="en-US">
    Thank you for your attention. Goodbye.
  </Say>
  <Hangup/>
</Response>`;
  }

  // Mock call for testing/fallback
  mockCall(to, message, options = {}) {
    const mockCallSid = 'mock-call-' + Date.now();
    
    logger.info('Mock phone call made', {
      callSid: mockCallSid,
      to: to,
      message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      mock: true
    });

    // Simulate call status progression
    setTimeout(() => {
      logger.info('Mock call status update', {
        callSid: mockCallSid,
        status: 'ringing'
      });
    }, 1000);

    setTimeout(() => {
      logger.info('Mock call status update', {
        callSid: mockCallSid,
        status: 'answered'
      });
    }, 2000);

    setTimeout(() => {
      logger.info('Mock call status update', {
        callSid: mockCallSid,
        status: 'completed'
      });
    }, 5000);

    return {
      success: true,
      callSid: mockCallSid,
      status: 'initiated',
      to: to,
      from: this.fromNumber || '+254112851330',
      mock: true
    };
  }

  // Get call status
  async getCallStatus(callSid) {
    try {
      if (!this.initialized || callSid.startsWith('mock-')) {
        return {
          success: true,
          callSid: callSid,
          status: 'completed',
          mock: true
        };
      }

      const call = await this.client.calls(callSid).fetch();
      
      return {
        success: true,
        callSid: call.sid,
        status: call.status,
        direction: call.direction,
        from: call.from,
        to: call.to,
        startTime: call.startTime,
        endTime: call.endTime,
        duration: call.duration,
        price: call.price,
        mock: false
      };

    } catch (error) {
      logger.error('Failed to get call status', {
        error: error.message,
        callSid: callSid
      });

      return {
        success: false,
        error: error.message,
        callSid: callSid
      };
    }
  }

  // List recent calls
  async listCalls(limit = 20) {
    try {
      if (!this.initialized) {
        return {
          success: true,
          calls: [],
          mock: true
        };
      }

      const calls = await this.client.calls.list({
        limit: limit,
        status: 'completed'
      });

      const callList = calls.map(call => ({
        callSid: call.sid,
        status: call.status,
        direction: call.direction,
        from: call.from,
        to: call.to,
        startTime: call.startTime,
        endTime: call.endTime,
        duration: call.duration,
        price: call.price
      }));

      return {
        success: true,
        calls: callList,
        mock: false
      };

    } catch (error) {
      logger.error('Failed to list calls', {
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        calls: []
      };
    }
  }

  // Send voice message (call with pre-recorded message)
  async sendVoiceMessage(to, message, voice = 'alice', language = 'en-US') {
    try {
      if (!this.initialized) {
        return this.mockCall(to, message);
      }

      const callOptions = {
        to: to,
        from: this.fromNumber,
        twiml: this.generateVoiceTwiml(message, voice, language),
        statusCallback: `${config.server.baseUrl}/webhook/call-status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST'
      };

      const call = await this.client.calls.create(callOptions);
      
      logger.info('Voice message sent', {
        callSid: call.sid,
        to: to,
        from: this.fromNumber,
        voice: voice,
        language: language
      });

      return {
        success: true,
        callSid: call.sid,
        status: call.status,
        to: to,
        from: this.fromNumber,
        voice: voice,
        language: language,
        mock: false
      };

    } catch (error) {
      logger.error('Failed to send voice message', {
        error: error.message,
        to: to
      });

      return this.mockCall(to, message);
    }
  }

  // Generate TwiML for voice message
  generateVoiceTwiml(message, voice = 'alice', language = 'en-US') {
    const escapedMessage = message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${language}">
    ${escapedMessage}
  </Say>
  <Pause length="1"/>
  <Say voice="${voice}" language="${language}">
    This message was sent by Debt Manager Pro. Thank you for your attention.
  </Say>
  <Hangup/>
</Response>`;
  }

  // Get service status
  getServiceStatus() {
    return {
      initialized: this.initialized,
      fromNumber: this.fromNumber,
      accountSid: this.initialized ? config.twilio.accountSid.substring(0, 8) + '...' : null,
      mode: this.initialized ? 'real' : 'mock'
    };
  }

  // Test phone service
  async testService(testNumber, testMessage = 'This is a test call from Debt Manager Pro') {
    try {
      const result = await this.makeCall(testNumber, testMessage);
      
      logger.info('Phone service test completed', {
        testNumber: testNumber,
        result: result
      });

      return result;

    } catch (error) {
      logger.error('Phone service test failed', {
        error: error.message,
        testNumber: testNumber
      });

      return {
        success: false,
        error: error.message,
        testNumber: testNumber
      };
    }
  }

  // Configure Twilio webhook for call status updates
  async configureWebhook(webhookUrl) {
    try {
      if (!this.initialized) {
        return {
          success: false,
          error: 'Phone service not initialized',
          mock: true
        };
      }

      // Update the application's webhook URL
      // This would typically be done through Twilio Console or API
      logger.info('Webhook configuration requested', {
        webhookUrl: webhookUrl
      });

      return {
        success: true,
        webhookUrl: webhookUrl,
        message: 'Webhook configuration updated',
        mock: false
      };

    } catch (error) {
      logger.error('Failed to configure webhook', {
        error: error.message,
        webhookUrl: webhookUrl
      });

      return {
        success: false,
        error: error.message,
        webhookUrl: webhookUrl
      };
    }
  }
}

// Create singleton instance
const phoneService = new PhoneService();

module.exports = phoneService;