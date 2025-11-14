import { useTranslation } from 'react-i18next';

export function TranslationDebugger() {
  const { t, i18n } = useTranslation();

  const debugKeys = [
    'common.errors.permission_system_error',
    'common.errors.permission_denied',
    'common.errors.access_denied',
    'common.buttons.close',
    'dashboard.title'
  ];

  return (
    <div className="fixed top-4 right-4 bg-white border border-gray-300 p-4 rounded-lg shadow-lg z-50 max-w-md">
      <h3 className="font-bold text-sm mb-2">Translation Debug</h3>

      <div className="text-xs space-y-1 mb-3">
        <div><strong>Language:</strong> {i18n.language}</div>
        <div><strong>Is Ready:</strong> {i18n.isInitialized ? 'Yes' : 'No'}</div>
        <div><strong>Has Resources:</strong> {i18n.hasResourceBundle(i18n.language, 'translation') ? 'Yes' : 'No'}</div>
      </div>

      <div className="text-xs space-y-1">
        <div className="font-semibold">Key Tests:</div>
        {debugKeys.map(key => {
          const translation = t(key);
          const isKeyShowing = translation === key;

          return (
            <div key={key} className={`p-1 rounded ${isKeyShowing ? 'bg-red-100' : 'bg-green-100'}`}>
              <div className="font-mono text-xs truncate">{key}</div>
              <div className={`text-xs ${isKeyShowing ? 'text-red-600' : 'text-green-600'}`}>
                → {translation}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => window.location.reload()}
        className="mt-2 px-2 py-1 bg-blue-500 text-white text-xs rounded"
      >
        Reload Page
      </button>
    </div>
  );
}
