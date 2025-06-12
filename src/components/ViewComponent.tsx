import React, { useState, useEffect } from 'react';
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
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import WorkflowStepper from './WorkflowStepper';
import FinancialTable from './FinancialTable';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

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
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchFiles();
    // Check if we have a newly uploaded file
    const state = location.state as { fileId?: string; newUpload?: boolean };
    if (state?.fileId) {
      setSelectedFile(state.fileId);
      handleFileSelect(state.fileId);
      if (state.newUpload) {
        // Automatically convert newly uploaded files
        convertFile(state.fileId);
      }
    }
  }, [location.state]);

  const fetchFiles = async () => {
    try {
      const response = await axios.get(`${API_URL}/files`);
      setFiles(response.data.files);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

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

  const convertFile = async (fileId: string) => {
    setConversionLoading(true);
    try {
      const response = await axios.get(`${API_URL}/convert`, {
        params: { fileId }
      });
      setConvertedData(response.data.rows.map((row: any, index: number) => ({
        id: `row-${index}`,
        ...row
      })));
      setActiveTab('table'); // Switch to table view after conversion
    } catch (error) {
      console.error('Error converting file:', error);
      toast.error('Failed to convert file');
    } finally {
      setConversionLoading(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const changePage = (offset: number) => {
    if (!numPages) return;
    const newPage = pageNumber + offset;
    if (newPage >= 1 && newPage <= numPages) {
      setPageNumber(newPage);
    }
  };

  const handleConfirmAndConvert = () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }
    
    if (!convertedData || convertedData.length === 0) {
      toast.error('Please wait for the conversion to complete');
      return;
    }

    navigate('/convert', { 
      state: { 
        fileId: selectedFile,
        data: convertedData 
      } 
    });
  };

  return (
    <div className="space-y-6">
      <WorkflowStepper currentStep="view" />

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
                            loading={
                              <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                              </div>
                            }
                          >
                            <Page
                              pageNumber={pageNumber}
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                              className="max-w-full h-auto"
                            />
                          </Document>
                        </div>
                        {numPages && numPages > 1 && (
                          <div className="flex items-center justify-center space-x-4 mt-4">
                            <button
                              onClick={() => changePage(-1)}
                              disabled={pageNumber <= 1}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                              <ChevronLeftIcon className="h-5 w-5 mr-1" />
                              Previous
                            </button>
                            <span className="text-sm text-gray-600">
                              Page {pageNumber} of {numPages}
                            </span>
                            <button
                              onClick={() => changePage(1)}
                              disabled={pageNumber >= numPages}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                              Next
                              <ChevronRightIcon className="h-5 w-5 ml-1" />
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
            onClick={handleConfirmAndConvert}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
          >
            Confirm & Convert
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ViewComponent; 