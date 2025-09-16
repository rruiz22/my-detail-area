import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function RouteLogger() {
  const location = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log("🔀 [NAVIGATION DEBUG] Route changed:", {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state,
      key: location.key,
      timestamp: new Date().toISOString(),
      authState: {
        hasUser: !!user,
        loading,
        userEmail: user?.email
      },
      renderState: {
        documentReady: document.readyState,
        windowLoaded: typeof window !== 'undefined'
      }
    });

    // Check if component is actually mounting/rendering
    const timeoutId = setTimeout(() => {
      console.log("🕐 [NAVIGATION DEBUG] 500ms after route change - checking render state");
      console.log("📍 Current DOM location:", window.location.pathname);
      console.log("📍 React Router location:", location.pathname);
      console.log("🎯 Are they synced?", window.location.pathname === location.pathname);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [location.pathname, location.search, location.hash, location.state, location.key, user, loading]);

  // Additional render tracking
  useEffect(() => {
    console.log("🏗️ [NAVIGATION DEBUG] RouteLogger component rendered for path:", location.pathname);
  });

  return null;
}
