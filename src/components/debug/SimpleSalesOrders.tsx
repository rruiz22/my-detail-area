import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function SimpleSalesOrders() {
  const { t } = useTranslation();

  useEffect(() => {
    console.log('[RouteMount] SimpleSalesOrders mounted');
    return () => console.log('[RouteUnmount] SimpleSalesOrders unmounted');
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>🚗 Sales Orders (Simplified)</h1>
      <p>This is a simplified version to test if the component mounts correctly.</p>
      <p>Translation test: {t('common.loading', 'Loading...')}</p>
      <div style={{
        border: '1px solid #ccc',
        padding: '15px',
        margin: '10px 0',
        backgroundColor: '#f5f5f5'
      }}>
        <h3>Component Status</h3>
        <ul>
          <li>✅ Component mounted successfully</li>
          <li>✅ React hooks working</li>
          <li>✅ Translation system working</li>
          <li>✅ Outlet rendering working</li>
        </ul>
      </div>
    </div>
  );
}