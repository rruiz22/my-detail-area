import { useLocation } from 'react-router-dom';

export function SimpleTestPage({ pageName }: { pageName: string }) {
  const location = useLocation();

  console.log(`🧪 SimpleTestPage ${pageName} is RENDERING at ${location.pathname}`);

  return (
    <div style={{
      padding: '20px',
      border: '2px solid green',
      backgroundColor: '#e8f5e8',
      margin: '20px'
    }}>
      <h1 style={{ color: 'green', fontSize: '24px' }}>
        ✅ {pageName} Test Page Working!
      </h1>
      <p><strong>Current Path:</strong> {location.pathname}</p>
      <p><strong>Timestamp:</strong> {new Date().toLocaleTimeString()}</p>
      <p>If you can see this, routing is working correctly.</p>
    </div>
  );
}