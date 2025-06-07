import React, { useState } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { TableData, TableCell, TableRow } from '../../types/DataValidation';
import { v4 as uuidv4 } from 'uuid';

interface ConversionResult {
  status: string;
  message: string;
  file_id: string;
  converted_files: {
    [key: string]: string;
  };
  validationData?: TableData;
}

interface TablePreview {
  headers: string[];
  rows: string[][];
}

interface FileConverterProps {
  file: File;
  onConversionComplete: (result: ConversionResult) => void;
  isConverting: boolean;
  setIsConverting: (isConverting: boolean) => void;
}

const FileConverter: React.FC<FileConverterProps> = ({
  file,
  onConversionComplete,
  isConverting,
  setIsConverting
}) => {
  const [progress, setProgress] = useState(0);
  const [tablePreview, setTablePreview] = useState<TablePreview | null>(null);
  const [convertedFiles, setConvertedFiles] = useState<ConversionResult['converted_files'] | null>(null);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [converted, setConverted] = useState(false);
  const [tableData, setTableData] = useState<TableData | null>(null);

  const formatDataForValidation = (headers: string[], rows: string[][]): TableData => {
    return {
      headers: ['id', ...headers],
      rows: rows.map((row, index) => {
        const rowData: { [key: string]: TableCell } = {
          id: {
            value: `row-${index + 1}`,
            metadata: { status: 'original' }
          }
        };
        
        headers.forEach((header, colIndex) => {
          rowData[header] = {
            value: row[colIndex] || '',
            metadata: {
              status: 'original',
              confidence: 1.0
            }
          };
        });
        
        return rowData;
      })
    };
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
      setConverted(false);
    }
  };

  const convertToTable = async () => {
    if (!file) return;

    setIsConverting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post<ConversionResult>('/api/convert', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { headers, rows } = response.data;
      const tableRows: TableRow[] = rows.map((row: any) => {
        const tableRow: TableRow = {
          id: {
            value: uuidv4(),
            isEdited: false,
            metadata: {
              status: 'original'
            }
          }
        };

        headers.forEach((header: string) => {
          tableRow[header] = {
            value: String(row[header] || ''),
            isEdited: false,
            metadata: {
              status: 'original',
              confidence: 1.0
            }
          };
        });

        return tableRow;
      });

      const newTableData: TableData = {
        headers,
        rows: tableRows
      };

      setTableData(newTableData);
      setConverted(true);
      toast.success('File converted successfully!');
    } catch (error) {
      console.error('Error converting file:', error);
      toast.error('Error converting file. Please try again.');
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = async (format: string) => {
    if (!convertedFiles?.[format]) return;
    
    try {
      const response = await axios.get(
        `http://localhost:8000${convertedFiles[format]}`,
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `converted.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${format.toUpperCase()} file successfully!`);
    } catch (error) {
      toast.error(`Error downloading ${format} file`);
    }
  };

  const handleContinueToValidation = () => {
    if (conversionResult) {
      onConversionComplete(conversionResult);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Toaster position="top-center" />
      
      {/* Convert Button and Progress Bar */}
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
          />
          <button
            onClick={convertToTable}
            disabled={!file || isConverting}
            className={`inline-flex items-center px-4 py-2 rounded ${
              !file || isConverting
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isConverting ? (
              <>
                <ArrowDownTrayIcon className="animate-bounce h-5 w-5 mr-2" />
                Converting...
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                Convert to Table
              </>
            )}
          </button>
        </div>

        {progress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Preview Table */}
      {converted && tableData && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Converted Table</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {tableData.headers.map((header: string, index: number) => (
                    <th
                      key={index}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableData.rows.map((row: TableRow) => (
                  <tr key={row.id.value}>
                    {tableData.headers.map((header: string) => (
                      <td
                        key={`${row.id.value}-${header}`}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                      >
                        {row[header]?.value || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Download and Navigation Buttons */}
      {convertedFiles && conversionResult && (
        <div className="mt-8 space-y-4">
          <div className="flex justify-center space-x-4">
            {Object.keys(convertedFiles).map((format) => (
              <button
                key={format}
                onClick={() => handleDownload(format)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                Download {format.toUpperCase()}
              </button>
            ))}
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={handleContinueToValidation}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors duration-200 flex items-center"
            >
              <span className="mr-2">Continue to Validation</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileConverter; 