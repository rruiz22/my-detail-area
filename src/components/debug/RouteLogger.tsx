import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { nav } from "@/utils/logger";

export function RouteLogger() {
  const location = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    nav("Route changed:", {
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
      nav("500ms after route change - checking render state");
      nav("Current DOM location:", window.location.pathname);
      nav("React Router location:", location.pathname);
      nav("Are they synced?", window.location.pathname === location.pathname);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [location.pathname, location.search, location.hash, location.state, location.key, user, loading]);

  // Additional render tracking
  useEffect(() => {
    nav("RouteLogger component rendered for path:", location.pathname);
  });

  return null;
}
