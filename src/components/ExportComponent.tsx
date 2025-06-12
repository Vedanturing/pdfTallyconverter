import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import {
  TableCellsIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface ExportFile {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
  formats: {
    excel?: string;
    csv?: string;
    xml?: string;
  };
}

const ExportComponent: React.FC = () => {
  const [files, setFiles] = useState<ExportFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    fetchExportedFiles();
  }, []);

  const fetchExportedFiles = async () => {
    try {
      const response = await axios.get(`${API_URL}/exports`);
      setFiles(response.data.files);
    } catch (error) {
      console.error('Error fetching exported files:', error);
      toast.error('Failed to load exported files');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileId: string, format: 'excel' | 'csv' | 'xml') => {
    const file = files.find(f => f.id === fileId);
    if (!file || !file.formats[format]) return;

    setDownloading(prev => ({ ...prev, [`${fileId}-${format}`]: true }));

    try {
      const response = await axios.get(file.formats[format]!, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${file.name}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success(`Downloaded ${format.toUpperCase()} successfully`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Failed to download ${format.toUpperCase()}`);
    } finally {
      setDownloading(prev => ({ ...prev, [`${fileId}-${format}`]: false }));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Exported Files</h3>
          <p className="mt-1 text-sm text-gray-500">
            Download your converted files in various formats
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {files.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <ArrowDownTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No exports</h3>
              <p className="mt-1 text-sm text-gray-500">
                Convert some files first to see them here
              </p>
            </div>
          ) : (
            files.map((file) => (
              <div key={file.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {file.name}
                    </h4>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDate(file.createdAt)} • {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    {file.formats.excel && (
                      <button
                        onClick={() => handleDownload(file.id, 'excel')}
                        disabled={downloading[`${file.id}-excel`]}
                        className={`
                          inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium
                          ${downloading[`${file.id}-excel`]
                            ? 'bg-gray-50 text-gray-400'
                            : 'text-gray-700 hover:bg-gray-50'
                          }
                        `}
                      >
                        <TableCellsIcon className="h-4 w-4 mr-1.5 text-green-600" />
                        Excel
                        {downloading[`${file.id}-excel`] && (
                          <div className="ml-1.5 animate-spin h-3 w-3 border-2 border-gray-300 rounded-full border-t-gray-600" />
                        )}
                      </button>
                    )}
                    {file.formats.csv && (
                      <button
                        onClick={() => handleDownload(file.id, 'csv')}
                        disabled={downloading[`${file.id}-csv`]}
                        className={`
                          inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium
                          ${downloading[`${file.id}-csv`]
                            ? 'bg-gray-50 text-gray-400'
                            : 'text-gray-700 hover:bg-gray-50'
                          }
                        `}
                      >
                        <DocumentTextIcon className="h-4 w-4 mr-1.5 text-blue-600" />
                        CSV
                        {downloading[`${file.id}-csv`] && (
                          <div className="ml-1.5 animate-spin h-3 w-3 border-2 border-gray-300 rounded-full border-t-gray-600" />
                        )}
                      </button>
                    )}
                    {file.formats.xml && (
                      <button
                        onClick={() => handleDownload(file.id, 'xml')}
                        disabled={downloading[`${file.id}-xml`]}
                        className={`
                          inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium
                          ${downloading[`${file.id}-xml`]
                            ? 'bg-gray-50 text-gray-400'
                            : 'text-gray-700 hover:bg-gray-50'
                          }
                        `}
                      >
                        <CodeBracketIcon className="h-4 w-4 mr-1.5 text-purple-600" />
                        XML
                        {downloading[`${file.id}-xml`] && (
                          <div className="ml-1.5 animate-spin h-3 w-3 border-2 border-gray-300 rounded-full border-t-gray-600" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportComponent; 