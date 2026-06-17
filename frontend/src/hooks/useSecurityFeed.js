import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

// Live security feed hook (Operation Red Zone Phase 6).
//
// Opens an authenticated Socket.IO connection (same origin, proxied by nginx at
// /socket.io) and surfaces security events pushed by the backend in real time.
// The current access token is sent in the handshake; the server only admits
// active admins/superadmins. Returns the most recent events (newest first) plus
// a connection flag for a live/offline indicator.
export function useSecurityFeed({ enabled = true, max = 50 } = {}) {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    // Same-origin connection; nginx upgrades /socket.io to the backend.
    const socket = io({
      path: "/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));
    socket.on("security_event", (event) => {
      setEvents((prev) => [{ ...event, _id: `${Date.now()}-${Math.random()}` }, ...prev].slice(0, max));
    });

    return () => {
      socket.off();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, max]);

  return { events, connected };
}
