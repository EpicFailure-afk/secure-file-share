const { sendEmail } = require("./email")
const User = require("../models/User")

/**
 * Generates a styled HTML email template for file share verification
 * @param {string} fileName - The name of the shared file
 * @param {string} code - The verification code
 * @param {string} requesterIP - IP address of the requester (optional)
 * @returns {string} HTML email template
 */
const generateShareVerificationEmail = (fileName, code, requesterIP = "Unknown") => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>File Access Request</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        
        body {
          font-family: 'Poppins', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f5f5f5;
          margin: 0;
          padding: 0;
        }
        
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .email-wrapper {
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        
        .email-header {
          background: linear-gradient(90deg, #ff8a00, #e52e71);
          padding: 30px 20px;
          text-align: center;
        }
        
        .email-header h1 {
          color: white;
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        
        .email-body {
          padding: 30px;
          text-align: center;
        }
        
        .message {
          margin-bottom: 30px;
          color: #555;
          font-size: 16px;
        }
        
        .file-info {
          margin: 20px auto;
          max-width: 400px;
          padding: 15px;
          background-color: #f7f7f7;
          border-radius: 8px;
          border: 1px solid #eaeaea;
          text-align: left;
        }
        
        .file-info p {
          margin: 5px 0;
          font-size: 14px;
        }
        
        .file-info strong {
          font-weight: 600;
          color: #333;
        }
        
        .code-container {
          margin: 30px auto;
          max-width: 300px;
          padding: 15px;
          background-color: #f7f7f7;
          border-radius: 8px;
          border: 1px solid #eaeaea;
        }
        
        .verification-code {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: 5px;
          color: #333;
        }
        
        .expiry {
          margin-top: 30px;
          font-size: 14px;
          color: #777;
        }
        
        .email-footer {
          background-color: #f7f7f7;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #999;
        }
        
        .logo {
          font-size: 22px;
          font-weight: 700;
          background: linear-gradient(90deg, #ff8a00, #e52e71);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          display: inline-block;
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="email-wrapper">
          <div class="email-header">
            <h1>File Access Request</h1>
          </div>
          <div class="email-body">
            <p class="message">Someone is requesting access to your shared file. Use the verification code below to grant them access.</p>
            
            <div class="file-info">
              <p><strong>File:</strong> ${fileName}</p>
              <p><strong>Request from:</strong> ${requesterIP}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="code-container">
              <div class="verification-code">${code}</div>
            </div>
            
            <p class="expiry">This code will expire in 30 minutes.</p>
            <p>If you did not share this file, you can safely ignore this email.</p>
          </div>
          <div class="email-footer">
            <div class="logo">SecureShare</div>
            <p>Secure file sharing made simple</p>
            <p>&copy; ${new Date().getFullYear()} SecureShare. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Sends a verification code email to the file owner
 * @param {string} fileId - ID of the shared file
 * @param {string} verificationCode - The verification code
 * @param {string} requesterIP - IP address of the requester
 * @returns {Promise<boolean>} - Whether the email was sent successfully
 */
const sendShareVerificationEmail = async (userId, fileName, verificationCode, requesterIP) => {
  try {
    // Get the user's email
    const user = await User.findById(userId)
    if (!user) {
      console.error("User not found for sending verification email")
      return false
    }

    const subject = "File Access Request - SecureShare"
    const plainText = `Someone is requesting access to your shared file "${fileName}". Verification code: ${verificationCode}. This code will expire in 30 minutes.`
    const htmlContent = generateShareVerificationEmail(fileName, verificationCode, requesterIP)

    await sendEmail(user.email, subject, plainText, htmlContent)
    return true
  } catch (error) {
    console.error("Error sending share verification email:", error)
    return false
  }
}

module.exports = {
  sendShareVerificationEmail,
}

