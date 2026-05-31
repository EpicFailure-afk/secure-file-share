import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaGithub, FaLinkedin, FaTwitter, FaHeart } from "react-icons/fa";
import styles from "./Footer.module.css";

const linkGroups = [
  {
    title: "Product",
    items: [
      { label: "Features", href: "#" },
      { label: "Pricing", href: "#" },
      { label: "Changelog", href: "#" },
    ],
  },
  {
    title: "Company",
    items: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Blog", href: "#" },
    ],
  },
  {
    title: "Support",
    items: [
      { label: "Help Center", href: "#" },
      { label: "Contact", to: "/contact" },
      { label: "Privacy", href: "#" },
    ],
  },
];

const socials = [
  { icon: <FaGithub />,   href: "https://github.com",   label: "GitHub" },
  { icon: <FaLinkedin />, href: "https://linkedin.com", label: "LinkedIn" },
  { icon: <FaTwitter />,  href: "https://twitter.com",  label: "Twitter" },
];

const Footer = () => (
  <footer className={styles.footer}>
    <div className={styles.inner}>
      <div className={styles.brandCol}>
        <Link to="/" className={styles.brandLink}>
          <span className={styles.brandMark} aria-hidden="true" />
          <span className={styles.brandText}>SecureShare</span>
        </Link>
        <p className={styles.tagline}>End-to-end encrypted file sharing for teams that care about privacy.</p>
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
      </div>

      <nav className={styles.linksGrid} aria-label="Footer">
        {linkGroups.map((g) => (
          <div key={g.title}>
            <h4 className={styles.groupTitle}>{g.title}</h4>
            <ul className={styles.linkList}>
              {g.items.map((it) =>
                it.to ? (
                  <li key={it.label}><Link to={it.to}>{it.label}</Link></li>
                ) : (
                  <li key={it.label}><a href={it.href}>{it.label}</a></li>
                ),
              )}
            </ul>
          </div>
        ))}
      </nav>
    </div>

    <div className={styles.bottom}>
      <p>© {new Date().getFullYear()} SecureShare. All rights reserved.</p>
      <p className={styles.love}>
        Made with <FaHeart className={styles.heart} aria-hidden="true" /> by the SecureShare team
      </p>
    </div>
  </footer>
);

export default Footer;
