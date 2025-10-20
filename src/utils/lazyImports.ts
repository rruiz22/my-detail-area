// Lazy import utilities for heavy libraries

// Recharts dynamic import with all components
export const importRecharts = async () => {
  const recharts = await import('recharts');
  return recharts;
};

// Tesseract.js dynamic import
export const importTesseract = async () => {
  const tesseract = await import('tesseract.js');
  return tesseract;
};

// Fabric.js dynamic import (canvas manipulation)
export const importFabric = async () => {
  const fabric = await import('fabric');
  return fabric;
};

// OpenCV.js dynamic import (computer vision) - using safe alternative
export const importOpenCV = async () => {
  const opencv = await import('@techstark/opencv-js');
  return opencv;
};

// Moment.js dynamic import (date utilities)
export const importMoment = async () => {
  const moment = await import('moment');
  return moment;
};

// HuggingFace transformers dynamic import (ML models)
export const importTransformers = async () => {
  const transformers = await import('@huggingface/transformers');
  return transformers;
};

// Utility type for dynamic imports
export type DynamicImportResult<T> = T extends () => Promise<infer U> ? U : never;