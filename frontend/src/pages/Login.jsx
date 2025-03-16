import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import styles from "./Login.module.css";
import { loginUser } from "../api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // Used for navigation after login

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear previous errors

    try {
      const response = await loginUser({ email, password });

      if (!response || response.error) {
        setError(response.error || "Login failed. Please try again.");
        return;
      }

      if (response.token) {
        localStorage.setItem("token", response.token);
        console.log("Login successful:", response);
        navigate("/dashboard"); // Redirect to dashboard after login
      } else {
        setError("Invalid response from server.");
      }
    } catch (err) {
      setError("Network error. Please check your connection.");
      console.error("Login Error:", err);
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
        {error && <p className={styles.error}>{error}</p>} {/* Show error messages */}
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
