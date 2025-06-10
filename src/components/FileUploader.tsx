import React, { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { v4 as uuidv4 } from 'uuid';
import * as pdfjsLib from 'pdfjs-dist';
import { UploadFile, FileMetadata } from '../types/file';
import { uploadFile } from '../utils/api';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface FileUploaderProps {
  onUploadComplete?: (files: FileMetadata[]) => void;
  maxFiles?: number;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const FileUploader: React.FC<FileUploaderProps> = ({
  onUploadComplete,
  maxFiles = 3
}) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const uploadingRef = useRef(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.slice(0, maxFiles - files.length).map(file => ({
      id: uuidv4(),
      file,
      status: 'pending' as const,
      progress: 0,
      uploadedAt: new Date()
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, [files.length, maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png']
    },
    maxFiles: maxFiles - files.length,
    disabled: files.length >= maxFiles
  });

  const processQueue = async () => {
    if (uploadingRef.current) return;
    uploadingRef.current = true;

    const pendingFiles = files.filter(f => f.status === 'pending');
    const uploadedMetadata: FileMetadata[] = [];

    for (const file of pendingFiles) {
      try {
        setFiles(prev =>
          prev.map(f =>
            f.id === file.id ? { ...f, status: 'uploading' } : f
          )
        );

        const metadata = await uploadFile(file.file);
        uploadedMetadata.push(metadata);

        setFiles(prev =>
          prev.map(f =>
            f.id === file.id
              ? { ...f, status: 'uploaded', metadata, progress: 100 }
              : f
          )
        );
      } catch (error) {
        setFiles(prev =>
          prev.map(f =>
            f.id === file.id
              ? { ...f, status: 'error', error: error.message }
              : f
          )
        );
      }
    }

    uploadingRef.current = false;
    if (onUploadComplete && uploadedMetadata.length > 0) {
      onUploadComplete(uploadedMetadata);
    }
  };

  React.useEffect(() => {
    if (files.some(f => f.status === 'pending')) {
      processQueue();
    }
  }, [files]);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${files.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label="File upload area"
      >
        <input {...getInputProps()} />
        <div className="text-gray-600">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M24 8v24m0-24l-8 8m8-8l8 8m-8 16v-8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-lg mt-4">Drag and drop your files here</p>
          <p className="text-sm mt-2">or click to select files</p>
          <p className="text-xs mt-2 text-gray-500">
            (PDF and image files only, max {maxFiles} files)
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-4">
          {files.map(file => (
            <div
              key={file.id}
              className="bg-white rounded-lg shadow-sm border p-4 flex items-center gap-4"
            >
              {/* File Type Icon */}
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100">
                {file.file.type === 'application/pdf' ? (
                  <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 18h12a2 2 0 002-2V6a2 2 0 00-2-2h-3.93a2 2 0 01-1.66-.89l-.812-1.22A2 2 0 008.93 1H4a2 2 0 00-2 2v13a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                  </svg>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.file.name}
                </p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(file.file.size)} • {file.uploadedAt?.toLocaleTimeString()}
                </p>
              </div>

              {/* Status */}
              <div className="flex-shrink-0 ml-4">
                {file.status === 'pending' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Pending
                  </span>
                )}
                {file.status === 'uploading' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Uploading...
                  </span>
                )}
                {file.status === 'uploaded' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Uploaded
                  </span>
                )}
                {file.status === 'error' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Error
                  </span>
                )}
              </div>

              {/* Remove Button */}
              <button
                onClick={() => removeFile(file.id)}
                className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-500"
                aria-label="Remove file"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploader; 