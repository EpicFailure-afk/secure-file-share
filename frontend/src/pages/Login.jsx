import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import styles from "./Login.module.css";
import { loginUser } from "../api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear previous errors

    const response = await loginUser({ email, password });

    if (response.error) {
      setError(response.error); // Display error if login fails
    } else {
      console.log("Login successful:", response);
      // Store the token (if any) in localStorage or context
      localStorage.setItem("token", response.token);
      // Redirect user to another page (if needed)
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
      <form className={styles.loginForm} onSubmit={handleSubmit}>
        <h2>Login</h2>
        <div className={styles.inputGroup}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className={styles.inputGroup}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className={styles.error}>{error}</p>}{" "}
        {/* Show errors if any */}
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
