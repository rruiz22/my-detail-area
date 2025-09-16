import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { useEffect } from 'react';

export function DebugOutlet() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    console.log('🔍 DebugOutlet: Location changed:', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state,
      key: location.key,
      navigationType
    });
  }, [location, navigationType]);

  console.log('🔍 DebugOutlet: Rendering with location:', location.pathname);

  return (
    <div style={{
      border: '3px solid orange',
      padding: '10px',
      margin: '10px',
      backgroundColor: '#fff3cd'
    }}>
      <h2 style={{ color: 'orange', margin: '0 0 10px 0' }}>
        🔍 DEBUG OUTLET - Path: {location.pathname}
      </h2>
      <p style={{ margin: '5px 0', fontSize: '14px' }}>
        Navigation Type: {navigationType} | Key: {location.key}
      </p>
      <div style={{
        border: '2px solid blue',
        padding: '10px',
        backgroundColor: '#cce5ff'
      }}>
        <h3 style={{ color: 'blue', margin: '0 0 10px 0' }}>
          💙 OUTLET CONTENT BELOW:
        </h3>
        <Outlet />
      </div>
    </div>
  );
}