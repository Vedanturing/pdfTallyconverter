import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import {
  ArrowPathIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import FinancialTable from './FinancialTable';
import WorkflowStepper from './WorkflowStepper';
import { useLocation } from 'react-router-dom';

interface ValidationRule {
  id: string;
  name: string;
  field: string;
  type: 'required' | 'format' | 'range' | 'custom';
  condition?: string;
  value?: string | number;
  enabled: boolean;
}

interface FinancialEntry {
  id: string;
  date: string;
  voucherNo: string;
  ledgerName: string;
  amount: number | string;
  narration: string;
  errors?: string[];
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

const EditComponent: React.FC = () => {
  const [data, setData] = useState<FinancialEntry[]>([]);
  const [rules, setRules] = useState<ValidationRule[]>(DEFAULT_RULES);
  const [validating, setValidating] = useState(false);
  const [hasErrors, setHasErrors] = useState(false);
  const [loading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const location = useLocation();
  const fileId = location.state?.fileId;
  const convertedFormats = location.state?.convertedFormats || [];

  useEffect(() => {
    fetchFiles();
    if (fileId) {
      loadData();
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

  const loadData = async () => {
    try {
      const response = await axios.get(`${API_URL}/convert`, {
        params: { fileId }
      });
      setData(response.data.rows.map((row: any) => ({ ...row, errors: [] })));
      validateData(response.data.rows);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
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

    setData(validatedData);
    const hasAnyErrors = validatedData.some(entry => entry.errors && entry.errors.length > 0);
    setHasErrors(hasAnyErrors);
    setValidating(false);

    if (hasAnyErrors) {
      toast.error('Validation errors found');
    } else {
      toast.success('Validation passed');
    }
  };

  const toggleRule = (ruleId: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  const handleDataChange = (updatedData: FinancialEntry[]) => {
    setData(updatedData);
    validateData(updatedData);
  };

  const handleFileSelect = async (fileId: string) => {
    setSelectedFile(fileId);
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/convert`, {
        params: { fileId }
      });
      setData(response.data.rows.map((row: any, index: number) => ({
        id: `row-${index}`,
        ...row
      })));
    } catch (error) {
      console.error('Error converting file:', error);
      toast.error('Failed to convert file');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'excel' | 'csv' | 'xml') => {
    if (!selectedFile) return;

    setExportLoading(format);
    try {
      const response = await axios.get(`${API_URL}/export`, {
        params: { fileId: selectedFile, format },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `converted.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export file');
    } finally {
      setExportLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Workflow Stepper */}
      <WorkflowStepper currentStep="edit" />

      {/* User Guidance */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              Review and edit your data. Toggle validation rules and fix any errors highlighted in red.
              All changes are automatically validated.
            </p>
          </div>
        </div>
      </div>

      {/* Validation Rules */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Validation Rules</h3>
          <div className="flex items-center space-x-2">
            <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-500">Toggle rules to customize validation</span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rules.map((rule) => (
            <button
              key={rule.id}
              onClick={() => toggleRule(rule.id)}
              className={`relative p-4 rounded-lg border transition-all duration-200 text-left ${
                rule.enabled
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{rule.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {rule.condition ? `${rule.field} (${rule.condition})` : rule.field}
                  </p>
                </div>
                {rule.enabled ? (
                  <CheckCircleIcon className="h-5 w-5 text-indigo-600" />
                ) : (
                  <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* File Selection */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select File</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((file) => (
            <button
              key={file.id}
              onClick={() => handleFileSelect(file.id)}
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

      {/* Controls */}
      {selectedFile && (
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setReadOnly(!readOnly)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              {readOnly ? (
                <>
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit Mode
                </>
              ) : (
                <>
                  <EyeIcon className="h-4 w-4 mr-2" />
                  View Mode
                </>
              )}
            </button>
          </div>

          <div className="flex items-center space-x-4">
            {['excel', 'csv', 'xml'].map((format) => (
              <button
                key={format}
                onClick={() => handleExport(format as 'excel' | 'csv' | 'xml')}
                disabled={exportLoading === format}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportLoading === format ? (
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                )}
                Export {format.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Data Table */}
      {data.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {validating ? (
                  <svg className="animate-spin h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : hasErrors ? (
                  <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                ) : (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                )}
                <span className="text-sm font-medium text-gray-900">
                  {validating
                    ? 'Validating...'
                    : hasErrors
                    ? 'Validation errors found'
                    : 'All entries valid'}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {convertedFormats.length > 0 && (
                  <span>Converted formats: {convertedFormats.join(', ').toUpperCase()}</span>
                )}
              </div>
            </div>
          </div>
          <FinancialTable
            data={data}
            onDataChange={handleDataChange}
            readOnly={false}
          />
        </div>
      )}
    </div>
  );
};

export default EditComponent; 