import { GlobalWorkerOptions } from 'pdfjs-dist';

// Ensure the worker is loaded from node_modules
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${GlobalWorkerOptions.workerSrc}/pdf.worker.min.js`;

export const configurePdfjs = () => {
  // You can add additional PDF.js configuration here if needed
  console.log('PDF.js worker configured');
}; 