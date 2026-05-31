import { useState } from "react";
import { motion } from "framer-motion";
import {
  FaEnvelope, FaPhone, FaMapMarkerAlt, FaClock,
  FaUser, FaPaperPlane, FaGithub, FaLinkedin, FaTwitter, FaFacebook,
} from "react-icons/fa";
import { Button, Card, CardBody, Badge } from "../components/atoms";
import { FormField, useToast } from "../components/molecules";
import Input from "../components/atoms/Input";
import Textarea from "../components/atoms/Textarea";
import { sendContactForm } from "../api";
import styles from "./Contact.module.css";

const contactRows = [
  { icon: <FaEnvelope />,      title: "Email",          body: "support@secureshare.com" },
  { icon: <FaPhone />,         title: "Phone",          body: "+20 1062 555 816" },
  { icon: <FaMapMarkerAlt />,  title: "Address",        body: "Delta University" },
  { icon: <FaClock />,         title: "Business hours", body: "Always on — full time" },
];

const socials = [
  { icon: <FaGithub />,   label: "GitHub",   href: "https://github.com" },
  { icon: <FaLinkedin />, label: "LinkedIn", href: "https://linkedin.com" },
  { icon: <FaTwitter />,  label: "Twitter",  href: "https://twitter.com" },
  { icon: <FaFacebook />, label: "Facebook", href: "https://facebook.com" },
];

const Contact = () => {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  const change = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await sendContactForm(formData);
      if (res.error) {
        setError(res.error);
      } else {
        toast.success({ title: "Message sent", description: "We'll get back to you within 24 hours." });
        setFormData({ name: "", email: "", subject: "", message: "" });
      }
    } catch (err) {
      console.error("Contact Form Error:", err);
      setError("Failed to send message. Please try again later.");
    } finally { setLoading(false); }
  };

  return (
    <div className={styles.page}>
      <motion.header
        className={styles.heading}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Badge variant="brand" size="sm">Talk to us</Badge>
        <h1 className={styles.title}>We&apos;re a message away</h1>
        <p className={styles.lead}>
          Bug, feature request, partnership idea, or just want to say hi — drop a note and a real human will reply.
        </p>
      </motion.header>

      <div className={styles.grid}>
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card variant="surface" elevation={2} padding="lg" className={styles.infoCard}>
            <CardBody style={{ padding: 0 }}>
              <h2 className={styles.infoTitle}>Get in touch</h2>
              <ul className={styles.infoList}>
                {contactRows.map((row) => (
                  <li key={row.title} className={styles.infoRow}>
                    <span className={styles.infoIcon}>{row.icon}</span>
                    <div>
                      <p className={styles.infoLabel}>{row.title}</p>
                      <p className={styles.infoValue}>{row.body}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className={styles.socials}>
                {socials.map((s) => (
                  <motion.a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.15 }}
                    className={styles.socialBtn}
                  >
                    {s.icon}
                  </motion.a>
                ))}
              </div>
            </CardBody>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <Card variant="glass" elevation={3} padding="lg">
            <CardBody style={{ padding: 0 }}>
              <h2 className={styles.formTitle}>Send us a message</h2>

              <form className={styles.form} onSubmit={submit}>
                <FormField label="Your name" required>
                  <Input name="name" placeholder="Jane Doe" value={formData.name} onChange={change} leftIcon={<FaUser />} required />
                </FormField>

                <FormField label="Email" required>
                  <Input type="email" name="email" placeholder="you@company.com" value={formData.email} onChange={change} leftIcon={<FaEnvelope />} required />
                </FormField>

                <FormField label="Subject" required>
                  <Input name="subject" placeholder="What is this about?" value={formData.subject} onChange={change} leftIcon={<FaPaperPlane />} required />
                </FormField>

                <FormField label="Your message" required>
                  <Textarea name="message" placeholder="Tell us what's on your mind…" value={formData.message} onChange={change} rows={5} required />
                </FormField>

                {error && <p className={styles.errorBox}>{error}</p>}

                <Button type="submit" variant="primary" size="lg" loading={loading} rightIcon={<FaPaperPlane />}>
                  Send message
                </Button>
              </form>
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Contact;
