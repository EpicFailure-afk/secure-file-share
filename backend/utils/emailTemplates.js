/**
 * Generates a styled HTML email template for verification codes
 * @param {string} code - The verification code
 * @param {string} type - The type of verification ('login' or 'reset')
 * @returns {string} HTML email template
 */
const generateVerificationEmail = (code, type) => {
    const title = type === "login" ? "Login Verification Code" : "Password Reset Code"
    const message =
      type === "login"
        ? "Use the verification code below to complete your login."
        : "Use the verification code below to reset your password."
    const expiry = "10 minutes"
  
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
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
              <h1>${title}</h1>
            </div>
            <div class="email-body">
              <p class="message">${message}</p>
              <div class="code-container">
                <div class="verification-code">${code}</div>
              </div>
              <p class="expiry">This code will expire in ${expiry}.</p>
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
  
  module.exports = {
    generateVerificationEmail,
  }
  
  