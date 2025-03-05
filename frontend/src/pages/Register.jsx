import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import styles from "./Register.module.css";
import { registerUser } from "../api";

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    try {
      const response = await registerUser({ username, email, password });
      setSuccess("Registration successful!");
      setError("");
      console.log(response);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed!");
    }
  };

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.5 }}
    >
      <form className={styles.registerForm} onSubmit={handleSubmit}>
        <h2>Register</h2>

        <div className={styles.inputGroup}>
          <input
            type="text"
            placeholder="Username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className={styles.inputGroup}>
          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className={styles.inputGroup}>
          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className={styles.inputGroup}>
          <input
            type="password"
            placeholder="Confirm Password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}

        <button type="submit" className={styles.btn}>
          Sign Up
        </button>

        <p className={styles.loginLink}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </motion.div>
  );
};

export default Register;
