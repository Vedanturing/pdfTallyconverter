import React, { useState } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { TableData, TableCell } from '../types/DataValidation';

interface ConversionResult {
  status: string;
  message: string;
  file_id: string;
  converted_files: {
    [key: string]: string;
  };
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

  const formatDataForValidation = (headers: string[], rows: string[][]): TableData => {
    return {
      headers,
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

  const handleConvert = async () => {
    setIsConverting(true);
    setProgress(0);
    
    // Simulate progress while conversion is happening
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev; // Stop at 90% until we get actual completion
        return prev + 10;
      });
    }, 500);

    try {
      // First upload the file
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await axios.post('http://localhost:8000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      if (uploadResponse.data.status !== 'success') {
        throw new Error(uploadResponse.data.message || 'Upload failed');
      }

      const fileId = uploadResponse.data.file_id;

      // Then convert the file
      const response = await axios.post<ConversionResult>(
        `http://localhost:8000/convert/${fileId}`
      );

      if (response.data.status === 'success') {
        // Set progress to 100% on success
        setProgress(100);
        setConvertedFiles(response.data.converted_files);
        
        // Fetch preview data (first few rows) from CSV
        if (response.data.converted_files.csv) {
          const previewResponse = await axios.get(
            `http://localhost:8000${response.data.converted_files.csv}`,
            { responseType: 'text' }
          );
          
          const rows = previewResponse.data
            .split('\n')
            .map((row: string) => row.split(','))
            .filter((row: string[]) => row.length > 1);
          
          if (rows.length > 0) {
            const headers = rows[0];
            const dataRows = rows.slice(1, 6); // Show first 5 rows
            setTablePreview({
              headers,
              rows: dataRows
            });

            // Format data for validation
            const validationData = formatDataForValidation(headers, dataRows);
            onConversionComplete({
              ...response.data,
              validationData
            });
          }
        }
        
        toast.success('File converted successfully!');
      } else {
        throw new Error(response.data.message || 'Conversion failed');
      }
    } catch (error: any) {
      setProgress(0);
      toast.error(
        error.response?.data?.message || 
        error.message ||
        'Error converting file. Please try again.',
        {
          duration: 4000,
          position: 'top-center',
        }
      );
    } finally {
      clearInterval(progressInterval);
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Toaster position="top-center" />
      
      {/* Convert Button and Progress Bar */}
      <div className="space-y-4">
        <div className="flex justify-center">
          <button
            onClick={handleConvert}
            disabled={isConverting}
            className={`
              px-6 py-2 rounded-lg font-medium text-white
              ${isConverting 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
              }
              transition-colors duration-200
            `}
          >
            {isConverting ? (
              <div className="flex items-center space-x-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Converting...</span>
              </div>
            ) : (
              'Convert File'
            )}
          </button>
        </div>

        {/* Progress Bar */}
        {(isConverting || progress > 0) && (
          <div className="w-full max-w-md mx-auto">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="text-center mt-2 text-sm text-gray-600">
              {progress}% Complete
            </div>
          </div>
        )}
      </div>

      {/* Table Preview */}
      {tablePreview && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Preview</h3>
          <div className="max-h-64 overflow-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {tablePreview.headers.map((header, i) => (
                    <th
                      key={i}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tablePreview.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Download Buttons */}
      {convertedFiles && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Download Converted Files</h3>
          <div className="flex flex-wrap gap-4">
            {Object.keys(convertedFiles).map((format) => (
              <button
                key={format}
                onClick={() => handleDownload(format)}
                className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
              >
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                Download {format.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileConverter; 