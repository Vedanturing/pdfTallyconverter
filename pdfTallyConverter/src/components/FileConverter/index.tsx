import React, { useState } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { TableData, TableCell } from '../../types/DataValidation';

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

  const handleConvert = async () => {
    setIsConverting(true);
    setProgress(0);
    setConversionResult(null);
    
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
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
            const result = {
              ...response.data,
              validationData
            };
            setConversionResult(result);
            onConversionComplete(result);
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
        'Error converting file. Please try again.'
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
            {isConverting ? 'Converting...' : 'Convert File'}
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
      {tablePreview && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Preview (First 5 rows)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {tablePreview.headers.map((header, index) => (
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
                {tablePreview.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
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