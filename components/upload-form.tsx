'use client';

import { useState, useRef, FormEvent, ChangeEvent, DragEvent } from 'react';
import { UploadState } from '@/lib/types';

interface UploadFormProps {
  onUpload: (formData: FormData) => Promise<void>;
  uploadState: UploadState;
}

export default function UploadForm({ onUpload, uploadState }: UploadFormProps) {
  const [apiKey, setApiKey] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoading = uploadState === 'uploading' || uploadState === 'processing';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!apiKey || !file) {
      alert('Please provide both an API key and a PDF file');
      return;
    }

    const formData = new FormData();
    formData.append('apiKey', apiKey);
    formData.append('file', file);

    await onUpload(formData);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        alert('Only PDF files are supported');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type !== 'application/pdf') {
        alert('Only PDF files are supported');
        return;
      }
      setFile(droppedFile);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (size: number): string => {
    if (size < 1024) return `${size} bytes`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      {/* API Key Input */}
      <div className="mb-8">
        <label 
          htmlFor="apiKey" 
          className="block text-sm font-medium text-morandi-700 mb-2 flex items-center"
        >
          <svg className="w-4 h-4 mr-2 text-morandiBlue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          Mistral API Key
        </label>
        <div className="relative">
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="morandi-input w-full pl-10 transition-all duration-300 focus:ring-morandiBlue-400 focus:border-morandiBlue-400"
            placeholder="Enter your Mistral API key"
            required
            disabled={isLoading}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-morandi-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
        <p className="mt-1.5 text-xs text-morandi-500 italic flex items-center">
          <svg className="w-3 h-3 mr-1 text-morandiBlue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Your API key is securely used only for this request and never stored
        </p>
      </div>

      {/* File Drop Zone */}
      <div 
        className={`relative overflow-hidden border-2 border-dashed rounded-2xl p-10 mb-8 text-center cursor-pointer transition-all duration-300 group ${
          isDragging 
            ? 'border-morandiBlue-400 bg-morandiBlue-50' 
            : 'border-morandi-200 hover:border-morandi-400 hover:bg-morandi-50'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading}
        />
        
        {/* Background decorative element */}
        <div className="absolute -bottom-16 -right-16 w-40 h-40 bg-morandi-100 opacity-20 rounded-full transform rotate-45 transition-transform group-hover:rotate-90 duration-700"></div>
        
        {file ? (
          <div className="py-2 relative z-10">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-morandiBlue-100 text-morandiBlue-600 mb-3">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF Document
            </div>
            <div className="font-medium text-morandiBlue-500 text-lg">{file.name}</div>
            <div className="text-sm text-morandi-500 mt-1.5">{formatFileSize(file.size)}</div>
            <button 
              type="button" 
              className="mt-5 group inline-flex items-center text-sm text-morandiBlue-500 hover:text-morandiBlue-600 focus:outline-none transition-colors duration-300 border-b border-morandiBlue-200 hover:border-morandiBlue-400 pb-0.5"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              disabled={isLoading}
            >
              <svg className="w-3.5 h-3.5 mr-1.5 transition-transform duration-300 group-hover:-rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Change file
            </button>
          </div>
        ) : (
          <div className="py-4 relative z-10">
            <div className="w-20 h-20 mx-auto relative animate-float">
              <svg className="w-full h-full text-morandi-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="mt-5 text-lg text-morandi-600 font-medium">
              Drag and drop a PDF file here, or <span className="text-morandiBlue-500 border-b border-morandiBlue-200 pb-0.5 transition-colors duration-300 group-hover:border-morandiBlue-400">click to browse</span>
            </p>
            <p className="mt-2 text-sm text-morandi-500">
              Only PDF files are supported
            </p>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className={`morandi-button btn-modern w-full py-3.5 px-6 text-base flex items-center justify-center gap-2 ${
          isLoading ? 'bg-morandi-400 cursor-not-allowed' : ''
        }`}
        disabled={isLoading || !apiKey || !file}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Extract Text from PDF
          </>
        )}
      </button>
    </form>
  );
} 