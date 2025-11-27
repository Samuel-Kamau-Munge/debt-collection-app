const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Twilio webhook for call status updates
router.post('/call-status', (req, res) => {
  try {
    const { CallSid, CallStatus, CallDuration, From, To } = req.body;
    
    logger.info('Call status update received', {
      callSid: CallSid,
      status: CallStatus,
      duration: CallDuration,
      from: From,
      to: To
    });

    // Here you could store call status in database
    // For now, just log it
    
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error processing call status webhook', { error: error.message });
    res.status(500).send('Error');
  }
});

// Twilio webhook for SMS status updates
router.post('/sms-status', (req, res) => {
  try {
    const { MessageSid, MessageStatus, From, To } = req.body;
    
    logger.info('SMS status update received', {
      messageSid: MessageSid,
      status: MessageStatus,
      from: From,
      to: To
    });

    // Here you could store SMS status in database
    // For now, just log it
    
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error processing SMS status webhook', { error: error.message });
    res.status(500).send('Error');
  }
});

module.exports = router;
