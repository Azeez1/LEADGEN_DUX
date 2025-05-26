const { google } = require('googleapis');
const nodemailer = require('nodemailer');

// Sends an email using the Gmail API with OAuth2 credentials.
async function sendEmail(message) {
  // TODO: build OAuth2 client and send message via gmail.users.messages.send
  return true;
}

module.exports = { sendEmail };
