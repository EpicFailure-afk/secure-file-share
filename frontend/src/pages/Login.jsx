import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import styles from "./Login.module.css";

const Login = () => {
  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.5 }}
    >
      <form className={styles.loginForm}>
        <h2>Login</h2>

        <div className={styles.inputGroup}>
          <input type="email" placeholder="Email" required />
        </div>

        <div className={styles.inputGroup}>
          <input type="password" placeholder="Password" required />
        </div>

        <button type="submit" className={styles.btn}>
          Sign In
        </button>

        <p className={styles.registerLink}>
          Don't have an account? <Link to="/register">Sign Up</Link>
        </p>
      </form>
    </motion.div>
  );
};

export default Login;
