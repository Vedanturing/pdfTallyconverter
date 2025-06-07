import React, { useState } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { v4 as uuidv4 } from 'uuid';
import { TableCell, TableRow, TableData, ConversionResult } from '../types/DataValidation';
import { API_URL } from '../config';

interface TablePreview {
  headers: string[];
  rows: string[][];
}

const FileConverter: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [converted, setConverted] = useState(false);
  const [tableData, setTableData] = useState<TableData | null>(null);

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
      const tableRows: TableRow[] = rows.map((row: any) => ({
        id: { value: uuidv4(), isEdited: false },
        ...Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key,
            { value: String(value), isEdited: false }
          ])
        )
      }));

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

  return (
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
    </div>
  );
};

export default FileConverter; 