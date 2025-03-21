const nodemailer = require("nodemailer")

const sendEmail = async (to, subject, text) => {
  try {
    // Create a test account if no SMTP configuration is provided
    let testAccount
    let transporter

    if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
      // Use provided SMTP configuration
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    } else {
      // Create a test account for development
      testAccount = await nodemailer.createTestAccount()
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      })
    }

    // Send email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"SecureShare" <security@secureshare.com>',
      to,
      subject,
      text,
    })

    console.log("Message sent: %s", info.messageId)

    // Log preview URL for test accounts
    if (testAccount) {
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info))
    }

    return info
  } catch (error) {
    console.error("Email sending error:", error)
    throw error
  }
}

module.exports = sendEmail

