const { google } = require('googleapis');
const nodemailer = require('nodemailer');

// Sends an email using Nodemailer with OAuth2 credentials sourced from
// environment variables. Returns the Gmail message ID on success.
async function sendEmail(message) {
  const {
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    GMAIL_REFRESH_TOKEN,
    FROM_EMAIL,
    REPLY_TO_EMAIL,
  } = process.env;

  const oauth2Client = new google.auth.OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
  );
  oauth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });

  let accessToken;
  try {
    const tokenResponse = await oauth2Client.getAccessToken();
    accessToken = typeof tokenResponse === 'object' ? tokenResponse.token : tokenResponse;
  } catch (err) {
    throw new Error(`Failed to obtain access token: ${err.message}`);
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: FROM_EMAIL,
      clientId: GMAIL_CLIENT_ID,
      clientSecret: GMAIL_CLIENT_SECRET,
      refreshToken: GMAIL_REFRESH_TOKEN,
      accessToken,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      replyTo: REPLY_TO_EMAIL,
      ...message,
    });
    return info.messageId;
  } catch (err) {
    // Rethrow to let callers handle failures appropriately
    throw new Error(`Failed to send email: ${err.message}`);
  }
}

module.exports = { sendEmail };
