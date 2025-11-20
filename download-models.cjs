// Script Node.js para descargar modelos de face-api desde vladmandic
const https = require('https');
const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, 'public', 'models');
const BASE_URL = 'https://github.com/vladmandic/face-api/raw/master/model';

const files = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

console.log('=====================================');
console.log('Face API Models Downloader');
console.log('Source: vladmandic/face-api');
console.log('=====================================\n');

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        const stats = fs.statSync(dest);
        const sizeKB = (stats.size / 1024).toFixed(2);
        resolve(sizeKB);
      });
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function downloadAll() {
  let success = 0;
  let failed = 0;

  for (const file of files) {
    try {
      process.stdout.write(`Descargando ${file}... `);
      const url = `${BASE_URL}/${file}`;
      const dest = path.join(MODELS_DIR, file);
      const sizeKB = await downloadFile(url, dest);
      console.log(`✓ (${sizeKB} KB)`);
      success++;
    } catch (error) {
      console.log(`✗ Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n=====================================');
  console.log(`Archivos descargados: ${success} / ${files.length}`);
  console.log(`Archivos fallidos: ${failed}`);
  console.log('=====================================\n');

  if (failed === 0) {
    console.log('✓ Todos los modelos descargados exitosamente!\n');
    process.exit(0);
  } else {
    console.log('✗ Algunos archivos fallaron\n');
    process.exit(1);
  }
}

// Ensure models directory exists
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

downloadAll().catch(console.error);
