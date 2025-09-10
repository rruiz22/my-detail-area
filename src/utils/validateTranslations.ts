// Utility to validate and fix translation JSON files
export const validateTranslationFile = async (filePath: string) => {
  try {
    const response = await fetch(filePath);
    const text = await response.text();
    
    // Try to parse the JSON
    const parsed = JSON.parse(text);
    console.log(`✅ ${filePath} is valid JSON`);
    return { valid: true, data: parsed };
  } catch (error) {
    console.error(`❌ ${filePath} has JSON errors:`, error);
    return { valid: false, error: error.message };
  }
};

// Validate all translation files
export const validateAllTranslations = async () => {
  const languages = ['en', 'es', 'pt-BR'];
  const results = [];
  
  for (const lang of languages) {
    const filePath = `/translations/${lang}.json`;
    const result = await validateTranslationFile(filePath);
    results.push({ language: lang, ...result });
  }
  
  return results;
};

// Run validation in development
if (import.meta.env.DEV) {
  validateAllTranslations().then(results => {
    results.forEach(result => {
      if (result.valid) {
        console.log(`✅ ${result.language}.json is valid`);
      } else {
        console.error(`❌ ${result.language}.json error:`, result.error);
      }
    });
  });
}