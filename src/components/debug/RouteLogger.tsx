import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function RouteLogger() {
  const location = useLocation();

  useEffect(() => {
    console.log("🔀 Route changed:", location.pathname, location.search);
  }, [location.pathname, location.search]);

  return null;
}
