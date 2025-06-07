import { GlobalWorkerOptions } from 'pdfjs-dist';

// Set up the worker
GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.min.js';

export const setupPdfjs = () => {
  console.log('PDF.js worker configured successfully');
}; 