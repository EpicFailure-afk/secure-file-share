import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./Register.module.css";
import { registerUser } from "../api";

const Register = () => {
  const [userData, setUserData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false); // Success popup state

  const handleChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (userData.password !== userData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const response = await registerUser(userData);

    if (response.error) {
      setError(response.error);
    } else {
      setSuccess(true); // Show success popup
      setUserData({ username: "", email: "", password: "", confirmPassword: "" });

      // Hide the popup after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.5 }}
    >
      <form className={styles.registerForm} onSubmit={handleSubmit}>
        <h2>Register</h2>

        <div className={styles.inputGroup}>
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={userData.username}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={userData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={userData.password}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={userData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.btn}>
          Sign Up
        </button>

        <p className={styles.loginLink}>
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </form>

      {/* Success Popup */}
      <AnimatePresence>
        {success && (
          <motion.div
            className={styles.successPopup}
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p>Registration Successful!</p>
            <button onClick={() => setSuccess(false)}>OK</button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Register;
