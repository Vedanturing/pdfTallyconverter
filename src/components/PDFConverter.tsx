import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import axios from 'axios';
import { API_URL, SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from '../config';
import {
  CloudArrowUpIcon,
  DocumentArrowDownIcon,
  DocumentIcon,
  DocumentTextIcon,
  TableCellsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import FinancialTable from './FinancialTable';
import clsx from 'clsx';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface FinancialEntry {
  id: string;
  date: string;
  voucherNo: string;
  ledgerName: string;
  amount: number | string;
  narration: string;
  errors?: string[];
}

interface ValidationRule {
  id: string;
  name: string;
  field: string;
  type: 'required' | 'format' | 'range' | 'custom';
  condition?: string;
  value?: string | number;
  enabled: boolean;
}

const DEFAULT_RULES: ValidationRule[] = [
  {
    id: 'required-date',
    name: 'Date Required',
    field: 'date',
    type: 'required',
    enabled: true
  },
  {
    id: 'date-format',
    name: 'Valid Date Format',
    field: 'date',
    type: 'format',
    condition: 'YYYY-MM-DD',
    enabled: true
  },
  {
    id: 'required-voucher',
    name: 'Voucher Number Required',
    field: 'voucherNo',
    type: 'required',
    enabled: true
  },
  {
    id: 'required-ledger',
    name: 'Ledger Name Required',
    field: 'ledgerName',
    type: 'required',
    enabled: true
  },
  {
    id: 'amount-required',
    name: 'Amount Required',
    field: 'amount',
    type: 'required',
    enabled: true
  },
  {
    id: 'amount-range',
    name: 'Amount Range',
    field: 'amount',
    type: 'range',
    condition: 'between',
    value: '0,1000000',
    enabled: true
  }
];

const EXPORT_FORMATS = [
  {
    id: 'xlsx',
    name: 'Excel Spreadsheet',
    extension: 'xlsx',
    icon: TableCellsIcon,
    description: 'Export as Microsoft Excel file'
  },
  {
    id: 'csv',
    name: 'CSV File',
    extension: 'csv',
    icon: DocumentArrowDownIcon,
    description: 'Export as CSV for universal compatibility'
  },
  {
    id: 'xml',
    name: 'XML Document',
    extension: 'xml',
    icon: DocumentArrowDownIcon,
    description: 'Export as XML for structured data'
  }
];

interface Step {
  id: number;
  name: string;
  icon: React.ForwardRefExoticComponent<any>;
  description: string;
  status: 'upcoming' | 'current' | 'complete';
}

const PDFConverter: React.FC = () => {
  const navigate = useNavigate();
  const [steps, setSteps] = useState<Step[]>([
    { 
      id: 1, 
      name: 'Upload', 
      icon: CloudArrowUpIcon, 
      description: 'Upload your PDF or image file',
      status: 'current' 
    },
    { 
      id: 2, 
      name: 'Preview', 
      icon: DocumentTextIcon, 
      description: 'Preview and verify your document',
      status: 'upcoming' 
    },
    { 
      id: 3, 
      name: 'Convert', 
      icon: TableCellsIcon, 
      description: 'Convert to desired format',
      status: 'upcoming' 
    },
    { 
      id: 4, 
      name: 'Validate', 
      icon: CheckCircleIcon, 
      description: 'Validate the converted data',
      status: 'upcoming' 
    }
  ]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [convertProgress, setConvertProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // View State
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(false);

  // Convert State
  const [convertedData, setConvertedData] = useState<FinancialEntry[]>([]);
  const [converting, setConverting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [convertedFormats, setConvertedFormats] = useState<Set<string>>(new Set());

  // Edit State
  const [rules, setRules] = useState<ValidationRule[]>(DEFAULT_RULES);
  const [validating, setValidating] = useState(false);
  const [hasErrors, setHasErrors] = useState(false);
  const [editedData, setEditedData] = useState<FinancialEntry[]>([]);

  const updateStepStatus = (stepId: number, status: Step['status']) => {
    setSteps(steps.map(step => 
      step.id === stepId ? { ...step, status } : step
    ));
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds 10MB limit');
      toast.error('File size exceeds 10MB limit');
      return;
    }

    setCurrentFile(file);
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    updateStepStatus(1, 'current');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        }
      });

      if (response.data.fileId) {
        updateStepStatus(1, 'complete');
        updateStepStatus(2, 'current');
        toast.success('File uploaded successfully');
        
        setConvertProgress(0);
        const convertResponse = await axios.post(`${API_URL}/convert`, {
          fileId: response.data.fileId
        }, {
          withCredentials: true,
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setConvertProgress(progress);
            }
          }
        });
        
        if (convertResponse.data) {
          updateStepStatus(2, 'complete');
          updateStepStatus(3, 'current');
          toast.success('File converted successfully');
          
          // Navigate to view component with the file ID
          navigate('/view', {
            state: {
              fileId: response.data.fileId,
              newUpload: true
            }
          });
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload file. Please try again.');
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  }, [navigate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: SUPPORTED_FILE_TYPES,
    multiple: false
  });

  const loadFile = async (fileId: string) => {
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

      // Automatically convert the file
      await convertFile(fileId);
    } catch (error) {
      console.error('Error loading file:', error);
      toast.error('Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const convertFile = async (fileId: string) => {
    setConverting(true);
    try {
      const response = await axios.get(`${API_URL}/convert`, {
        params: { fileId }
      });
      const data = response.data.rows.map((row: any, index: number) => ({
        id: `row-${index}`,
        ...row,
        errors: []
      }));
      setConvertedData(data);
      setEditedData(data);
      validateData(data);
    } catch (error) {
      console.error('Error converting file:', error);
      toast.error('Failed to convert file');
    } finally {
      setConverting(false);
    }
  };

  const handleExport = async (format: string) => {
    if (!selectedFile) {
      toast.error('No file selected');
      return;
    }

    setSelectedFormat(format);
    try {
      const response = await axios.get(`${API_URL}/convert`, {
        params: { 
          fileId: selectedFile,
          format
        },
        responseType: 'blob'
      });

      setConvertedFormats(prev => new Set([...prev, format]));
      
      const blob = new Blob([response.data], { 
        type: format === 'xlsx' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : format === 'csv'
          ? 'text/csv'
          : 'application/xml'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `converted-file.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Successfully exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export as ${format.toUpperCase()}`);
    } finally {
      setSelectedFormat(null);
    }
  };

  const validateData = (dataToValidate: FinancialEntry[]) => {
    setValidating(true);
    const validatedData = dataToValidate.map(entry => {
      const errors: string[] = [];
      
      rules.forEach(rule => {
        if (!rule.enabled) return;

        const value = entry[rule.field as keyof FinancialEntry];
        
        switch (rule.type) {
          case 'required':
            if (!value || value.toString().trim() === '') {
              errors.push(`${rule.field} is required`);
            }
            break;

          case 'format':
            if (rule.field === 'date') {
              const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
              if (!dateRegex.test(value as string)) {
                errors.push('Invalid date format (YYYY-MM-DD)');
              }
            }
            break;

          case 'range':
            if (rule.field === 'amount' && rule.value) {
              const [min, max] = rule.value.toString().split(',').map(Number);
              const amount = Number(value);
              if (isNaN(amount) || amount < min || amount > max) {
                errors.push(`Amount must be between ${min} and ${max}`);
              }
            }
            break;
        }
      });

      return { ...entry, errors };
    });

    setEditedData(validatedData);
    const hasAnyErrors = validatedData.some(entry => entry.errors && entry.errors.length > 0);
    setHasErrors(hasAnyErrors);
    setValidating(false);
  };

  const toggleRule = (ruleId: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  const handleDataChange = (updatedData: FinancialEntry[]) => {
    setEditedData(updatedData);
    validateData(updatedData);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Steps */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex justify-center" aria-label="Progress">
            <ol role="list" className="flex items-center py-8 space-x-16">
              {steps.map((step, stepIdx) => (
                <li key={step.id} className={clsx(
                  stepIdx !== steps.length - 1 ? 'pr-16' : '',
                  'relative'
                )}>
                  {stepIdx !== steps.length - 1 && (
                    <div className="absolute top-4 right-0 -mr-16 w-16 h-0.5 bg-gray-200" />
                  )}
                  <div className="relative flex flex-col items-center group">
                    <span className="h-9 flex items-center">
                      <span className={clsx(
                        'relative z-10 w-10 h-10 flex items-center justify-center rounded-full transition-colors duration-300',
                        {
                          'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2': step.status === 'current',
                          'bg-green-600 text-white': step.status === 'complete',
                          'bg-gray-200 text-gray-500': step.status === 'upcoming'
                        }
                      )}>
                        <step.icon className="w-6 h-6" />
                      </span>
                    </span>
                    <span className="absolute -bottom-10 text-sm font-medium text-gray-900">
                      {step.name}
                    </span>
                    <div className="absolute -bottom-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gray-900 text-white text-xs rounded py-1 px-2 pointer-events-none whitespace-nowrap">
                      {step.description}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Tips Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <InformationCircleIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-900">Tips for best results</h3>
                <div className="mt-2 text-sm text-blue-700 space-y-1">
                  <p>• Ensure your PDF is clearly scanned and text is readable</p>
                  <p>• Supported formats: PDF, PNG, JPG, JPEG (max. 10MB)</p>
                  <p>• For best results, use PDF files with searchable text</p>
                  <p>• Tables should have clear borders and consistent formatting</p>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Card */}
          <div className="bg-white shadow-sm rounded-lg p-8">
            <div className="text-center">
              <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-blue-600" />
              <h2 className="mt-2 text-xl font-semibold text-gray-900">Upload Document</h2>
              <p className="mt-1 text-sm text-gray-500">
                Drag and drop your file here or click to browse
              </p>
            </div>

            <div
              {...getRootProps()}
              className={clsx(
                'mt-6 border-2 border-dashed rounded-lg p-12',
                'transition-all duration-150 ease-in-out',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                {
                  'border-blue-500 bg-blue-50': isDragActive,
                  'border-gray-300 hover:border-blue-400': !isDragActive,
                }
              )}
            >
              <input {...getInputProps()} />
              <div className="text-center">
                {uploading ? (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center">
                      <ArrowPathIcon className="animate-spin h-8 w-8 text-blue-600 mb-4" />
                      <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5 mb-2 overflow-hidden">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        Uploading... {uploadProgress}%
                      </p>
                    </div>
                    {convertProgress > 0 && (
                      <div className="flex flex-col items-center">
                        <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5 mb-2 overflow-hidden">
                          <div 
                            className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${convertProgress}%` }}
                          />
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          Converting... {convertProgress}%
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {currentFile ? (
                      <div className="space-y-3">
                        <DocumentTextIcon className="mx-auto h-8 w-8 text-blue-600" />
                        <p className="text-sm font-medium text-gray-900">{currentFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(currentFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <CloudArrowUpIcon className={clsx(
                          "mx-auto h-12 w-12 transition-colors duration-300",
                          isDragActive ? "text-blue-600" : "text-gray-400"
                        )} />
                        <p className="text-base text-gray-600">
                          {isDragActive
                            ? 'Drop the file here...'
                            : 'Drag & drop your file here, or click to browse'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Supported formats: PDF, PNG, JPG, JPEG (max. 10MB)
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentFile && !uploading && !error && (
              <div className="mt-6">
                <div className="rounded-md bg-green-50 p-4">
                  <div className="flex">
                    <CheckCircleIcon className="h-5 w-5 text-green-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        File ready for processing
                      </h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>Your file has been uploaded and is ready for conversion.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFConverter; 