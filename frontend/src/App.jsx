import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import MeshBackdrop from "./components/MeshBackdrop";
import ErrorBoundary from "./components/ErrorBoundary";
import RouteFallback from "./components/RouteFallback";
import { ThemeProvider } from "./theme/ThemeContext";
import { AuthProvider } from "./auth/AuthContext";
import { useAuth } from "./auth/useAuth";
import { ToastProvider } from "./components/molecules";
import { sendHeartbeat } from "./api";
import "./App.css";

const Home            = lazy(() => import("./pages/Home"));
const Login           = lazy(() => import("./pages/Login"));
const Register        = lazy(() => import("./pages/Register"));
const Dashboard       = lazy(() => import("./pages/Dashboard"));
const ForgotPassword  = lazy(() => import("./pages/ForgotPassword"));
const EditProfile     = lazy(() => import("./pages/EditProfile"));
const SharePage       = lazy(() => import("./pages/SharePage"));
const Contact         = lazy(() => import("./pages/Contact"));
const AdminDashboard  = lazy(() => import("./pages/AdminDashboard"));
const OrgDashboard    = lazy(() => import("./pages/OrgDashboard"));
const ManagerDashboard = lazy(() => import("./pages/ManagerDashboard"));
const Styleguide       = lazy(() => import("./pages/Styleguide"));

const AnimatedRoutes = () => {
  const location = useLocation();
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
        <Route path="/styleguide" element={<Styleguide />} />
      </Routes>
    </AnimatePresence>
  );
};

const HeartbeatRunner = () => {
  const { isAuthed } = useAuth();
  useEffect(() => {
    if (!isAuthed) return;
    sendHeartbeat();
    const id = setInterval(() => {
      if (localStorage.getItem("token")) sendHeartbeat();
    }, 30000);
    return () => clearInterval(id);
  }, [isAuthed]);
  return null;
};

const Shell = () => {
  const location = useLocation();
  const isSharePage = location.pathname.startsWith("/share/");

  return (
    <div className="app-container">
      <MeshBackdrop variant={location.pathname === "/" ? "hero" : "ambient"} />
      {!isSharePage && <Navbar />}
      <main className={`content ${isSharePage ? "full-height" : ""}`}>
        <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <AnimatedRoutes />
          </Suspense>
        </ErrorBoundary>
      </main>
      {!isSharePage && <Footer />}
      <HeartbeatRunner />
    </div>
  );
};

const App = () => (
  <Router>
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  </Router>
);

export default App;
