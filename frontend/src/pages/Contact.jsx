"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaClock,
  FaUser,
  FaPaperPlane,
  FaGithub,
  FaLinkedin,
  FaTwitter,
  FaFacebook,
} from "react-icons/fa"
import styles from "./Contact.module.css"
import { sendContactForm } from "../api"

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await sendContactForm(formData)

      if (response.error) {
        setError(response.error)
      } else {
        setSuccess("Your message has been sent successfully! We'll get back to you soon.")
        setFormData({
          name: "",
          email: "",
          subject: "",
          message: "",
        })
      }
    } catch (err) {
      setError("Failed to send message. Please try again later.")
      console.error("Contact Form Error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.contactContainer}>
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1>Contact Us</h1>
        <p>
          Have questions or feedback? We'd love to hear from you. Fill out the form below or reach out to us directly
          using the contact information.
        </p>
      </motion.div>

      <div className={styles.contactContent}>
        <motion.div
          className={styles.contactInfo}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className={styles.infoCard}>
            <h2>Get In Touch</h2>

            <div className={styles.infoItem}>
              <FaEnvelope className={styles.infoIcon} />
              <div className={styles.infoText}>
                <h3>Email</h3>
                <p>support@secureshare.com</p>
              </div>
            </div>

            <div className={styles.infoItem}>
              <FaPhone className={styles.infoIcon} />
              <div className={styles.infoText}>
                <h3>Phone</h3>
                <p>+1 (555) 123-4567</p>
              </div>
            </div>

            <div className={styles.infoItem}>
              <FaMapMarkerAlt className={styles.infoIcon} />
              <div className={styles.infoText}>
                <h3>Address</h3>
                <p>123 Security Street, Digital City, 10101</p>
              </div>
            </div>

            <div className={styles.infoItem}>
              <FaClock className={styles.infoIcon} />
              <div className={styles.infoText}>
                <h3>Business Hours</h3>
                <p>Monday - Friday: 9AM - 5PM</p>
              </div>
            </div>

            <div className={styles.socialLinks}>
              <a href="#" className={styles.socialLink} aria-label="GitHub">
                <FaGithub />
              </a>
              <a href="#" className={styles.socialLink} aria-label="LinkedIn">
                <FaLinkedin />
              </a>
              <a href="#" className={styles.socialLink} aria-label="Twitter">
                <FaTwitter />
              </a>
              <a href="#" className={styles.socialLink} aria-label="Facebook">
                <FaFacebook />
              </a>
            </div>
          </div>
        </motion.div>

        <motion.div
          className={styles.contactForm}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className={styles.formCard}>
            <h2>Send Us a Message</h2>

            {error && (
              <motion.div className={styles.error} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div className={styles.success} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                {success}
              </motion.div>
            )}

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="name">Your Name</label>
                <div className={styles.inputGroup}>
                  <FaUser className={styles.inputIcon} />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email">Email Address</label>
                <div className={styles.inputGroup}>
                  <FaEnvelope className={styles.inputIcon} />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="subject">Subject</label>
                <div className={styles.inputGroup}>
                  <FaPaperPlane className={styles.inputIcon} />
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    placeholder="What is this regarding?"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="message">Your Message</label>
                <div className={styles.inputGroup}>
                  <textarea
                    id="message"
                    name="message"
                    placeholder="Type your message here..."
                    value={formData.message}
                    onChange={handleChange}
                    required
                  ></textarea>
                </div>
              </div>

              <button type="submit" className={styles.submitButton} disabled={loading}>
                {loading ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Contact
