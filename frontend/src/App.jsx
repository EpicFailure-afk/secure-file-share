"use client";

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
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
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
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  const location = useLocation();
  const isSharePage = location.pathname.startsWith("/share/");

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
