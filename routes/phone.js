const express = require('express');
const router = express.Router();
const phoneService = require('../services/phoneService');
const logger = require('../utils/logger');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Apply token verification to all routes except webhooks
router.use((req, res, next) => {
  if (req.path.startsWith('/webhook')) {
    next();
  } else {
    verifyToken(req, res, next);
  }
});

// Make a phone call
router.post('/call', async (req, res) => {
  try {
    const { to, message, options = {} } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await phoneService.makeCall(to, message, options);

    logger.info('Phone call initiated', { 
      userId: req.user.id, 
      to: to,
      result: result
    });

    res.json(result);
  } catch (error) {
    logger.error('Failed to make phone call', { 
      error: error.message, 
      userId: req.user.id 
    });
    res.status(500).json({ error: 'Failed to make phone call' });
  }
});

// Send voice message
router.post('/voice-message', async (req, res) => {
  try {
    const { to, message, voice = 'alice', language = 'en-US' } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await phoneService.sendVoiceMessage(to, message, voice, language);

    logger.info('Voice message sent', { 
      userId: req.user.id, 
      to: to,
      result: result
    });

    res.json(result);
  } catch (error) {
    logger.error('Failed to send voice message', { 
      error: error.message, 
      userId: req.user.id 
    });
    res.status(500).json({ error: 'Failed to send voice message' });
  }
});

// Get call status
router.get('/call/:callSid/status', async (req, res) => {
  try {
    const { callSid } = req.params;
    
    const result = await phoneService.getCallStatus(callSid);

    res.json(result);
  } catch (error) {
    logger.error('Failed to get call status', { 
      error: error.message, 
      callSid: req.params.callSid,
      userId: req.user.id 
    });
    res.status(500).json({ error: 'Failed to get call status' });
  }
});

// List recent calls
router.get('/calls', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const result = await phoneService.listCalls(limit);

    res.json(result);
  } catch (error) {
    logger.error('Failed to list calls', { 
      error: error.message, 
      userId: req.user.id 
    });
    res.status(500).json({ error: 'Failed to list calls' });
  }
});

// Test phone service
router.post('/test', async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const testMessage = message || 'This is a test call from Debt Manager Pro to verify phone communication is working properly.';

    const result = await phoneService.testService(phone, testMessage);

    logger.info('Phone service test completed', { 
      userId: req.user.id, 
      phone: phone,
      result: result
    });

    res.json(result);
  } catch (error) {
    logger.error('Phone service test failed', { 
      error: error.message, 
      userId: req.user.id 
    });
    res.status(500).json({ error: 'Phone service test failed' });
  }
});

// Get service status
router.get('/status', async (req, res) => {
  try {
    const status = phoneService.getServiceStatus();

    res.json({
      success: true,
      status: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get phone service status', { 
      error: error.message, 
      userId: req.user.id 
    });
    res.status(500).json({ error: 'Failed to get service status' });
  }
});

// Configure webhook
router.post('/webhook/configure', async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    
    if (!webhookUrl) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }

    const result = await phoneService.configureWebhook(webhookUrl);

    res.json(result);
  } catch (error) {
    logger.error('Failed to configure webhook', { 
      error: error.message, 
      userId: req.user.id 
    });
    res.status(500).json({ error: 'Failed to configure webhook' });
  }
});

// Webhook endpoint for call status updates (no auth required)
router.post('/webhook/call-status', async (req, res) => {
  try {
    const { CallSid, CallStatus, From, To, Duration, RecordingUrl } = req.body;
    
    logger.info('Call status webhook received', {
      callSid: CallSid,
      status: CallStatus,
      from: From,
      to: To,
      duration: Duration,
      recordingUrl: RecordingUrl
    });

    // Here you can process the call status update
    // For example, update a database record, send notifications, etc.
    
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Failed to process call status webhook', { 
      error: error.message,
      body: req.body
    });
    res.status(500).send('Error processing webhook');
  }
});

// Webhook endpoint for Twilio callbacks (no auth required)
router.post('/webhook/twilio', async (req, res) => {
  try {
    const twilioSignature = req.headers['x-twilio-signature'];
    const twilioWebhookUrl = req.originalUrl;
    
    // Verify Twilio signature (optional but recommended for production)
    // const twilio = require('twilio');
    // const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // const isValid = twilioClient.validateRequest(twilioClient.authToken, twilioSignature, twilioWebhookUrl, req.body);
    
    logger.info('Twilio webhook received', {
      signature: twilioSignature,
      body: req.body
    });

    // Process the webhook data
    const { CallSid, CallStatus, From, To, Direction, Duration } = req.body;
    
    if (CallSid && CallStatus) {
      logger.info('Call status update', {
        callSid: CallSid,
        status: CallStatus,
        from: From,
        to: To,
        direction: Direction,
        duration: Duration
      });
    }

    res.status(200).send('OK');
  } catch (error) {
    logger.error('Failed to process Twilio webhook', { 
      error: error.message,
      body: req.body
    });
    res.status(500).send('Error processing webhook');
  }
});

module.exports = router;

