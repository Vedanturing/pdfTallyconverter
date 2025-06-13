import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Document, Page, pdfjs } from 'react-pdf';
import { API_URL } from '../config';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentArrowDownIcon,
  ArrowRightIcon,
  TableCellsIcon,
  DocumentTextIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import WorkflowStepper from './WorkflowStepper';
import FinancialTable from './FinancialTable';
import { initPdfWorker, cleanupPdfWorker } from '../utils/pdfjs-config';

interface FinancialEntry {
  id: string;
  date: string;
  voucherNo: string;
  ledgerName: string;
  amount: number | string;
  narration: string;
}

const ViewComponent: React.FC = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [convertedData, setConvertedData] = useState<FinancialEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'document' | 'table'>('document');
  const [conversionLoading, setConversionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const currentBlobUrl = useRef<string | null>(null);
  const isMounted = useRef(true);

  // Initialize PDF worker when component mounts
  useEffect(() => {
    initPdfWorker();
    return () => {
      cleanupPdfWorker();
    };
  }, []);

  const loadFile = useCallback(async (fileId: string) => {
    if (!isMounted.current) return;
    
    setLoading(true);
    setError(null);
    setFileUrl(null); // Clear previous file URL

    // Cleanup previous blob URL if it exists
    if (currentBlobUrl.current) {
      window.URL.revokeObjectURL(currentBlobUrl.current);
      currentBlobUrl.current = null;
    }

    try {
      console.log('Fetching file with ID:', fileId);
      const response = await axios.get(`${API_URL}/file/${fileId}`, {
        responseType: 'blob'
      });
      
      if (!isMounted.current) return;

      const type = response.headers['content-type'];
      const isPdf = type === 'application/pdf';
      setFileType(isPdf ? 'pdf' : 'image');
      
      const blob = new Blob([response.data], { type });
      const url = window.URL.createObjectURL(blob);
      currentBlobUrl.current = url;
      
      // Small delay to ensure cleanup is complete
      setTimeout(() => {
        if (isMounted.current) {
          setFileUrl(url);
          setPageNumber(1);
        }
      }, 100);
    } catch (error) {
      if (!isMounted.current) return;
      
      console.error('Error loading file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load file';
      setError(errorMessage);
      toast.error(errorMessage);
      navigate('/', { replace: true });
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [navigate]);

  useEffect(() => {
    isMounted.current = true;
    
    const state = location.state as { fileId?: string; newUpload?: boolean };
    
    if (!state?.fileId) {
      const error = 'No file selected';
      console.error(error);
      setError(error);
      toast.error(error);
      navigate('/', { replace: true });
      return;
    }

    setSelectedFile(state.fileId);
    loadFile(state.fileId);

    return () => {
      isMounted.current = false;
      
      if (currentBlobUrl.current) {
        window.URL.revokeObjectURL(currentBlobUrl.current);
        currentBlobUrl.current = null;
      }
    };
  }, [location.state, navigate, loadFile]);

  const handleFileSelect = async (fileId: string) => {
    setSelectedFile(fileId);
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/file/${fileId}`, {
        responseType: 'blob'
      });
      
      const type = response.headers['content-type'];
      const isPdf = type === 'application/pdf';
      setFileType(isPdf ? 'pdf' : 'image');
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      setFileUrl(url);
      setPageNumber(1);

      // Load converted data if it exists
      convertFile(fileId);
    } catch (error) {
      console.error('Error loading file:', error);
      toast.error('Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const convertFile = async (fileId: string, conversionToast?: string) => {
    setConversionLoading(true);
    try {
      console.log('Converting file with ID:', fileId);
      const response = await axios.post(`${API_URL}/convert/${fileId}`);
      console.log('Conversion response:', response.data);
      
      if (response.data.rows) {
        setConvertedData(response.data.rows.map((row: any, index: number) => ({
          id: `row-${index}`,
          ...row
        })));
        setActiveTab('table'); // Switch to table view after conversion
      }
      
      if (conversionToast) {
        toast.success('Document converted successfully', {
          id: conversionToast
        });
      }
    } catch (error) {
      console.error('Error converting file:', error);
      if (conversionToast) {
        toast.error('Failed to convert document', {
          id: conversionToast
        });
      } else {
        toast.error('Failed to convert file');
      }
    } finally {
      setConversionLoading(false);
    }
  };

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    console.log('PDF loaded successfully with', numPages, 'pages');
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error loading PDF:', error);
    setError(error.message);
    setLoading(false);
    toast.error('Failed to load PDF document');
  }, []);

  const changePage = (offset: number) => {
    if (!numPages) return;
    const newPage = pageNumber + offset;
    if (newPage >= 1 && newPage <= numPages) {
      setPageNumber(newPage);
    }
  };

  const handleProceed = () => {
    const state = location.state as { fileId?: string };
    navigate('/convert', { 
      state: { fileId: state.fileId },
      replace: true
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">
        <p className="text-lg font-medium mb-4">Error loading document</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  console.log('Rendering preview section:', {
    fileUrl,
    fileType,
    selectedFile,
    convertedData: convertedData.length
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <WorkflowStepper currentStep="preview" />

      {/* User Guidance */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-md shadow-sm">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              Review your document and the converted preview. Once you're satisfied, click "Confirm & Convert" to proceed with format selection.
            </p>
          </div>
        </div>
      </div>

      {/* File Selection */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <DocumentIcon className="h-5 w-5 text-gray-400 mr-2" />
          Select Document
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((file) => (
            <button
              key={file.id}
              onClick={() => handleFileSelect(file.id)}
              className={`relative p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                selectedFile === file.id
                  ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600 ring-opacity-50'
                  : 'border-gray-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <DocumentArrowDownIcon className={`h-6 w-6 ${
                  selectedFile === file.id ? 'text-indigo-600' : 'text-gray-400'
                }`} />
                <div className="flex-1 text-left">
                  <p className={`text-sm font-medium ${
                    selectedFile === file.id ? 'text-indigo-900' : 'text-gray-900'
                  }`}>{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(file.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* View Tabs */}
      {selectedFile && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('document')}
                className={`${
                  activeTab === 'document'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center transition-colors duration-200`}
              >
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Original Document
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`${
                  activeTab === 'table'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center transition-colors duration-200`}
              >
                <TableCellsIcon className="h-5 w-5 mr-2" />
                Converted Data
              </button>
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <>
                {activeTab === 'document' && fileUrl && (
                  <div className="flex flex-col items-center">
                    {fileType === 'pdf' ? (
                      <>
                        <div className="w-full max-w-3xl mx-auto shadow-lg rounded-lg overflow-hidden">
                          <Document
                            file={fileUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            loading={
                              <div className="flex items-center justify-center min-h-[400px]">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
                              </div>
                            }
                            options={{
                              disableWorker: false,
                              disableRange: false,
                              disableStream: false
                            }}
                          >
                            <Page
                              pageNumber={pageNumber}
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                            />
                          </Document>
                        </div>
                        {numPages && numPages > 1 && (
                          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm">
                            <button
                              onClick={() => changePage(-1)}
                              disabled={pageNumber <= 1}
                              className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
                            >
                              <ChevronLeftIcon className="h-5 w-5" />
                            </button>
                            <span className="text-sm">
                              Page {pageNumber} of {numPages}
                            </span>
                            <button
                              onClick={() => changePage(1)}
                              disabled={pageNumber >= numPages}
                              className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
                            >
                              <ChevronRightIcon className="h-5 w-5" />
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full max-w-3xl mx-auto">
                        <img
                          src={fileUrl}
                          alt="Uploaded file"
                          className="max-w-full h-auto rounded-lg shadow-lg"
                        />
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'table' && convertedData.length > 0 && (
                  <div className="mt-4">
                    <FinancialTable
                      data={convertedData}
                      readOnly={true}
                      onDataChange={() => {}}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {selectedFile && convertedData.length > 0 && (
        <div className="flex justify-end space-x-4">
          <button
            onClick={handleProceed}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
          >
            <ArrowDownTrayIcon className="ml-2 h-5 w-5" />
            Confirm & Convert
          </button>
        </div>
      )}
    </div>
  );
};

export default ViewComponent; 