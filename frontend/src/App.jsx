"use client";

import { useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom"
import { AnimatePresence } from "framer-motion"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Home from "./pages/Home"
import Dashboard from "./pages/Dashboard"
import ForgotPassword from "./pages/ForgotPassword"
import EditProfile from "./pages/EditProfile"
import SharePage from "./pages/SharePage"
import Contact from "./pages/Contact"
import AdminDashboard from "./pages/AdminDashboard"
import OrgDashboard from "./pages/OrgDashboard"
import ManagerDashboard from "./pages/ManagerDashboard"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import { sendHeartbeat } from "./api"
import "./App.css"

const AnimatedRoutes = () => {
  const location = useLocation();
  const isSharePage = location.pathname.startsWith("/share/");

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/share/:token" element={<SharePage />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/organization" element={<OrgDashboard />} />
        <Route path="/manager-dashboard" element={<ManagerDashboard />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  const location = useLocation();
  const isSharePage = location.pathname.startsWith("/share/");

  // Send heartbeat every 60 seconds to track online status
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return

    // Send initial heartbeat
    sendHeartbeat()

    // Set up interval for heartbeat
    const heartbeatInterval = setInterval(() => {
      const currentToken = localStorage.getItem("token")
      if (currentToken) {
        sendHeartbeat()
      }
    }, 60000) // Every 60 seconds

    return () => clearInterval(heartbeatInterval)
  }, [])

  return (
    <div className="app-container">
      {!isSharePage && <Navbar />}
      <main className={`content ${isSharePage ? "full-height" : ""}`}>
        <AnimatedRoutes />
      </main>
      {!isSharePage && <Footer />}
    </div>
  );
}

const AppWrapper = () => {
  return (
    <Router>
      <App />
    </Router>
  );
};

export default AppWrapper;
