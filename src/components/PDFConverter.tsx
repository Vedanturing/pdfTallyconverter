import React from 'react';
import FileUploader from './FileUploader';

const PDFConverter: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mt-8">
        <FileUploader />
      </div>
    </div>
  );
};

export default PDFConverter; 