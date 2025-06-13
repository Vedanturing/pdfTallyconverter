import { pdfjs } from 'react-pdf';

// Prevent worker from being created multiple times
let pdfjsWorker: Worker | null = null;

export const initPdfWorker = () => {
  try {
    // Only create a new worker if one doesn't exist
    if (!pdfjsWorker) {
      // Import the worker directly from node_modules
      const workerUrl = new URL(
        '../../node_modules/pdfjs-dist/legacy/build/pdf.worker.js',
        import.meta.url
      );
      
      pdfjsWorker = new Worker(workerUrl, {
        type: 'module',
        name: 'PDFWorker'
      });

      // Set the worker
      pdfjs.GlobalWorkerOptions.workerPort = pdfjsWorker;
    }

    console.log('PDF.js version:', pdfjs.version);
    console.log('Worker initialized successfully');
  } catch (error) {
    console.error('Error initializing PDF.js worker:', error);
    throw error;
  }
};

// Cleanup function to terminate worker
export const cleanupPdfWorker = () => {
  if (pdfjsWorker) {
    pdfjsWorker.terminate();
    pdfjsWorker = null;
    console.log('PDF.js worker terminated');
  }
}; 