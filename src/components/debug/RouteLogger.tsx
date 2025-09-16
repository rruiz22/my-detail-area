import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function RouteLogger() {
  const location = useLocation();

  useEffect(() => {
    console.log("🔀 Route changed:", {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state,
      key: location.key
    });
  }, [location.pathname, location.search, location.hash, location.state, location.key]);

  return null;
}
