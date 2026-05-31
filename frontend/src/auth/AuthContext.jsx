import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getUserProfile, logoutUser } from "../api";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

/* Session-cached profile fetch. Replaces the per-route refetch in the
   old Navbar useEffect, which hit /api/users/profile on every navigation. */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | authed | guest
  const inFlight = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setStatus("guest");
      return null;
    }
    if (inFlight.current) return inFlight.current;
    setStatus("loading");
    inFlight.current = (async () => {
      try {
        const profile = await getUserProfile();
        const next = profile?.user || null;
        setUser(next);
        setStatus(next ? "authed" : "guest");
        return next;
      } catch (err) {
        console.error("Profile fetch error:", err);
        setUser(null);
        setStatus("guest");
        return null;
      } finally {
        inFlight.current = null;
      }
    })();
    return inFlight.current;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (location.pathname === "/login" || location.pathname === "/register") {
      refresh();
    }
  }, [location.pathname, refresh]);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("sessionId");
      setUser(null);
      setStatus("guest");
      navigate("/");
    }
  }, [navigate]);

  const value = useMemo(
    () => ({ user, status, isAuthed: status === "authed", refresh, logout }),
    [user, status, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
