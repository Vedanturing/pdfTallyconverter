import React, { useState, lazy, Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import FileUpload from './components/FileUpload';
import Layout from './components/Layout';
import { TableData } from './types/DataValidation';

// Lazy load components not needed on initial render
const FilePreview = lazy(() => import('./components/FilePreview'));
const FileConverter = lazy(() => import('./components/FileConverter'));
const DataValidationPanel = lazy(() => import('./components/DataValidationPanel/DataValidationPanel'));

interface ConvertedFile {
  fileId: string;
  validationData: TableData;
  converted_files: {
    [key: string]: string;
  };
}

function App() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [convertedFile, setConvertedFile] = useState<ConvertedFile | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [activeStep, setActiveStep] = useState<'upload' | 'preview' | 'convert' | 'validate'>('upload');

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setActiveStep('preview');
  };

  const handleConversionComplete = (result: any) => {
    setConvertedFile({
      fileId: result.file_id,
      validationData: result.validationData,
      converted_files: result.converted_files
    });
    setIsConverting(false);
    setActiveStep('validate');
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 'upload':
        return (
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
            <FileUpload onFileUpload={handleFileUpload} />
          </div>
        );
      case 'preview':
        return (
          <Suspense fallback={<div className="flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div></div>}>
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="mb-6">
                <button
                  onClick={() => setActiveStep('upload')}
                  className="text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Upload
                </button>
              </div>
              {uploadedFile && previewUrl && (
                <>
                  <FilePreview file={uploadedFile} previewUrl={previewUrl} />
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setActiveStep('convert')}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Continue to Conversion
                    </button>
                  </div>
                </>
              )}
            </div>
          </Suspense>
        );
      case 'convert':
        return (
          <Suspense fallback={<div className="flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div></div>}>
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="mb-6">
                <button
                  onClick={() => setActiveStep('preview')}
                  className="text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Preview
                </button>
              </div>
              {uploadedFile && (
                <FileConverter
                  file={uploadedFile}
                  onConversionComplete={handleConversionComplete}
                  isConverting={isConverting}
                  setIsConverting={setIsConverting}
                />
              )}
            </div>
          </Suspense>
        );
      case 'validate':
        return (
          <Suspense fallback={<div className="flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div></div>}>
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="mb-6">
                <button
                  onClick={() => setActiveStep('convert')}
                  className="text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Conversion
                </button>
              </div>
              {convertedFile && convertedFile.validationData && (
                <DataValidationPanel
                  initialData={convertedFile.validationData}
                  fileId={convertedFile.fileId}
                />
              )}
            </div>
          </Suspense>
        );
    }
  };

  return (
    <BrowserRouter>
      <Layout>
        <Toaster position="top-right" />
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              {['upload', 'preview', 'convert', 'validate'].map((step, index) => (
                <React.Fragment key={step}>
                  {index > 0 && (
                    <div className={`h-1 w-16 ${
                      ['upload', 'preview', 'convert', 'validate'].indexOf(activeStep) >= index
                        ? 'bg-blue-600'
                        : 'bg-gray-200'
                    }`} />
                  )}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activeStep === step
                        ? 'bg-blue-600 text-white'
                        : ['upload', 'preview', 'convert', 'validate'].indexOf(activeStep) > ['upload', 'preview', 'convert', 'validate'].indexOf(step)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {['upload', 'preview', 'convert', 'validate'].indexOf(activeStep) > ['upload', 'preview', 'convert', 'validate'].indexOf(step) ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className={`mt-2 text-sm font-medium ${
                      activeStep === step ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step.charAt(0).toUpperCase() + step.slice(1)}
                    </span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="mt-8">
            {renderStepContent()}
          </div>
        </div>
      </Layout>
    </BrowserRouter>
  );
}

export default App; 