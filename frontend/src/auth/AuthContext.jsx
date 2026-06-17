import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getUserProfile, logoutUser, refreshAccessToken } from "../api";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

// Refresh the access token this many ms before it actually expires.
const REFRESH_LEAD_MS = 60 * 1000;

/* Session-cached profile fetch. Replaces the per-route refetch in the
   old Navbar useEffect, which hit /api/users/profile on every navigation.
   Also drives silent access-token refresh: because every API call reads the
   token fresh from localStorage, refreshing it there keeps all calls working
   without touching individual call sites. */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | authed | guest
  const inFlight = useRef(null);
  const refreshTimer = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Schedule a silent refresh shortly before the current access token expires.
  const scheduleSilentRefresh = useCallback(() => {
    clearTimeout(refreshTimer.current);
    const exp = Number(localStorage.getItem("tokenExpiresAt") || 0);
    if (!exp || !localStorage.getItem("refreshToken")) return;
    const delay = Math.max(5000, exp - Date.now() - REFRESH_LEAD_MS);
    refreshTimer.current = setTimeout(async () => {
      const ok = await refreshAccessToken();
      if (ok) {
        scheduleSilentRefresh();
      } else {
        // Refresh token gone/expired/revoked — drop to guest state.
        setUser(null);
        setStatus("guest");
      }
    }, delay);
  }, []);

  // Ensure we have a non-expired access token, refreshing if needed.
  const ensureValidAccessToken = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return false;
    const exp = Number(localStorage.getItem("tokenExpiresAt") || 0);
    if (exp && Date.now() > exp - REFRESH_LEAD_MS && localStorage.getItem("refreshToken")) {
      return refreshAccessToken();
    }
    return true;
  }, []);

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
        // Renew the access token first if it's expired/near-expiry.
        await ensureValidAccessToken();
        if (!localStorage.getItem("token")) {
          setUser(null);
          setStatus("guest");
          return null;
        }
        const profile = await getUserProfile();
        const next = profile?.user || null;
        setUser(next);
        setStatus(next ? "authed" : "guest");
        if (next) scheduleSilentRefresh();
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
  }, [ensureValidAccessToken, scheduleSilentRefresh]);

  useEffect(() => {
    refresh();
    return () => clearTimeout(refreshTimer.current);
  }, [refresh]);

  useEffect(() => {
    if (location.pathname === "/login" || location.pathname === "/register") {
      refresh();
    }
  }, [location.pathname, refresh]);

  const logout = useCallback(async () => {
    clearTimeout(refreshTimer.current);
    try {
      await logoutUser(localStorage.getItem("sessionId"));
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // logoutUser clears auth storage; clear any stragglers defensively.
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("tokenExpiresAt");
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
