import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import {
  DocumentArrowDownIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  TableCellsIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import WorkflowStepper from './WorkflowStepper';
import { useWorkflowStore } from '../store/useWorkflowStore';

interface ConversionStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
}

interface ExportFormat {
  id: string;
  name: string;
  extension: string;
  icon: React.ForwardRefExoticComponent<any>;
  description: string;
}

const EXPORT_FORMATS: ExportFormat[] = [
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
    icon: DocumentIcon,
    description: 'Export as XML for structured data'
  }
];

const ConvertComponent: React.FC = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversionStatus, setConversionStatus] = useState<ConversionStatus>({
    status: 'pending'
  });
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [converting, setConverting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [convertedFormats, setConvertedFormats] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const location = useLocation();
  const { setStep } = useWorkflowStore();

  const availableFormats = [
    { id: 'xlsx', name: 'Excel (XLSX)', icon: '📊', description: 'Best for data analysis and calculations' },
    { id: 'csv', name: 'CSV', icon: '📝', description: 'Simple format for data interchange' },
    { id: 'xml', name: 'XML', icon: '🔧', description: 'Structured format for system integration' }
  ];

  useEffect(() => {
    fetchFiles();
    const state = location.state as { fileId?: string };
    if (!state?.fileId) {
      toast.error('No file selected');
      navigate('/', { replace: true });
    }
  }, [location.state, navigate]);

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

  const toggleFormat = (formatId: string) => {
    setSelectedFormats(prev =>
      prev.includes(formatId)
        ? prev.filter(f => f !== formatId)
        : [...prev, formatId]
    );
  };

  const handleConvert = async () => {
    if (!selectedFile || selectedFormats.length === 0) {
      toast.error('Please select a file and at least one format');
      return;
    }

    setConversionStatus({ status: 'processing', progress: 0 });

    try {
      // Start conversion
      const response = await axios.post(`${API_URL}/convert`, {
        fileId: selectedFile,
        formats: selectedFormats
      });

      // Poll for conversion status
      const statusInterval = setInterval(async () => {
        try {
          const statusResponse = await axios.get(
            `${API_URL}/conversion-status/${response.data.conversionId}`
          );

          const { status, progress } = statusResponse.data;

          setConversionStatus({
            status,
            progress: progress || 0
          });

          if (status === 'completed' || status === 'failed') {
            clearInterval(statusInterval);
            
            if (status === 'completed') {
              toast.success('Conversion completed successfully');
            } else {
              toast.error('Conversion failed');
            }
          }
        } catch (error) {
          console.error('Error checking conversion status:', error);
          clearInterval(statusInterval);
          setConversionStatus({
            status: 'failed',
            error: 'Failed to check conversion status'
          });
        }
      }, 1000);
    } catch (error) {
      console.error('Error starting conversion:', error);
      setConversionStatus({
        status: 'failed',
        error: 'Failed to start conversion'
      });
      toast.error('Failed to start conversion');
    }
  };

  const handleProceedToEdit = () => {
    if (selectedFile) {
      navigate('/edit', { state: { fileId: selectedFile } });
    } else {
      toast.error('Please complete the conversion first');
    }
  };

  const getStatusIcon = () => {
    switch (conversionStatus.status) {
      case 'processing':
        return <ArrowPathIcon className="h-5 w-5 animate-spin text-indigo-600" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const handleExport = async (format: string) => {
    const state = location.state as { fileId?: string };
    if (!state?.fileId) {
      toast.error('No file selected');
      return;
    }

    setSelectedFormat(format);
    try {
      const response = await axios.get(`${API_URL}/convert`, {
        params: { 
          fileId: state.fileId,
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
      navigate('/validate', { 
        state: { fileId: state.fileId },
        replace: true
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export as ${format.toUpperCase()}`);
    } finally {
      setSelectedFormat(null);
    }
  };

  const handleMoveToValidate = () => {
    if (convertedFormats.size === 0) {
      toast.error('Please convert to at least one format before proceeding');
      return;
    }
    navigate('/edit', { 
      state: { 
        fileId: selectedFile,
        convertedFormats: Array.from(convertedFormats)
      } 
    });
  };

  return (
    <div className="space-y-6">
      {/* Workflow Stepper */}
      <WorkflowStepper currentStep="convert" />

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
              Choose your desired export format(s). You can export to multiple formats before proceeding to validation.
              Once you're done converting, click "Move to Validate" to check and edit your data.
            </p>
          </div>
        </div>
      </div>

      {/* File Selection */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Selected File</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((file) => (
            <button
              key={file.id}
              onClick={() => setSelectedFile(file.id)}
              className={`relative p-4 rounded-lg border transition-all duration-200 ${
                selectedFile === file.id
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <DocumentArrowDownIcon className="h-6 w-6 text-gray-400" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(file.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Export Format Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EXPORT_FORMATS.map((format) => (
          <div
            key={format.id}
            className="relative rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <format.icon className={`h-8 w-8 ${
                  convertedFormats.has(format.id) ? 'text-indigo-600' : 'text-gray-400'
                }`} />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {format.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {format.description}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => handleExport(format.id)}
                disabled={converting && selectedFormat === format.id}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                  convertedFormats.has(format.id)
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 w-full justify-center`}
              >
                {converting && selectedFormat === format.id ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Converting...
                  </>
                ) : (
                  <>
                    {convertedFormats.has(format.id) ? (
                      <>
                        <CheckCircleIcon className="mr-2 h-5 w-5 text-white" />
                        Downloaded
                      </>
                    ) : (
                      <>Export as {format.extension.toUpperCase()}</>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={handleMoveToValidate}
          disabled={convertedFormats.size === 0}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          Move to Validate
          <ArrowRightIcon className="ml-2 h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default ConvertComponent; 