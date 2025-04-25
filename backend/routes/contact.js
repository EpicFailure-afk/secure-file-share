const express = require("express")
const { sendEmail } = require("../utils/email")
const router = express.Router()

/**
 * @route POST /api/contact
 * @desc Send contact form message
 * @access Public
 */
router.post("/", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body

    // Validate input
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "All fields are required" })
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Please provide a valid email address" })
    }

    // Create email content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contact Form Submission</title>
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
          }
          
          .message-info {
            margin-bottom: 20px;
          }
          
          .message-info p {
            margin: 5px 0;
          }
          
          .message-info strong {
            font-weight: 600;
            color: #333;
          }
          
          .message-content {
            background-color: #f7f7f7;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
          }
          
          .message-content h2 {
            margin-top: 0;
            color: #333;
            font-size: 18px;
          }
          
          .message-content p {
            white-space: pre-line;
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
              <h1>New Contact Form Submission</h1>
            </div>
            <div class="email-body">
              <div class="message-info">
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              </div>
              
              <div class="message-content">
                <h2>Message:</h2>
                <p>${message}</p>
              </div>
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

    // Send email
    const emailSubject = `Contact Form: ${subject}`
    const plainText = `
      Name: ${name}
      Email: ${email}
      Subject: ${subject}
      
      Message:
      ${message}
    `

    await sendEmail(process.env.EMAIL_FROM, emailSubject, plainText, htmlContent)

    res.status(200).json({ success: true, message: "Message sent successfully" })
  } catch (error) {
    console.error("Contact form error:", error)
    res.status(500).json({ error: "Failed to send message. Please try again later." })
  }
})

module.exports = router
