'use client';

import { useState } from 'react';
import UploadForm from '@/components/upload-form';
import ResultDisplay from '@/components/result-display';
import AIChat from '@/components/ai-chat';
import WeatherBackground from '@/components/weather-background';
import { OCRResponse, UploadState, ApiError } from '@/lib/types';

export default function Home() {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [result, setResult] = useState<OCRResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState<boolean>(false);

  const handleUpload = async (formData: FormData) => {
    try {
      setUploadState('uploading');
      setError(null);
      setShowChat(false);

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      setUploadState('processing');

      if (!response.ok) {
        const errorData = await response.json() as ApiError;
        throw new Error(errorData.message || `Error: ${response.status}`);
      }

      const data = await response.json() as { result: OCRResponse };
      setResult(data.result);
      setUploadState('success');
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : String(err));
      setUploadState('error');
    }
  };

  // 提取文档内容作为 AI 聊天的上下文
  const extractDocumentContent = (): string => {
    if (!result) return '';
    
    // 优先使用 document.markdown 或 document.content
    if (result.document?.markdown) return result.document.markdown;
    if (result.document?.content) return result.document.content;
    
    // 如果没有文档级别的内容，则使用顶层的 markdown 或 content
    if (result.markdown) return result.markdown;
    if (result.content) return result.content;
    
    // 如果上述都没有，尝试从页面中提取内容并组合
    if (result.pages && result.pages.length > 0) {
      return result.pages
        .map(page => {
          const pageContent = page.markdown || page.content || '';
          return `--- Page ${page.page_num} ---\n${pageContent}\n`;
        })
        .join('\n');
    }
    
    return '';
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-morandi-pattern">
      {/* 天气背景 */}
      <WeatherBackground initialWeather="sun" />
      
      {/* 装饰性背景元素 */}
      <div className="decorative-circle decorative-circle-1 animate-pulse-slow"></div>
      <div className="decorative-circle decorative-circle-2 animate-pulse-slow"></div>
      
      <div 
        className="fixed top-0 right-0 w-[45%] h-screen bg-morandiBlue-100 opacity-20 rounded-blob animate-rotate-blob" 
        style={{ transformOrigin: 'center center' }}>
      </div>
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="text-center mb-20">
          <h1 className="font-display italic text-5xl sm:text-6xl lg:text-7xl font-bold text-morandi-800 leading-tight mb-4 animate-float">
            <span className="text-morandiBlue-500">Mistral</span> OCR
          </h1>
          
          <div className="h-1.5 w-20 bg-gradient-to-r from-morandiBlue-300 to-morandiPink-300 rounded-full mx-auto my-6"></div>
          
          <p className="mt-6 text-xl text-morandi-600 max-w-2xl mx-auto leading-relaxed">
            Transform your documents into beautifully formatted text with advanced AI capabilities, 
            powered by <span className="text-morandi-800 font-medium">Mistral Intelligence</span>
          </p>
        </div>

        <div className="glass-card sm:rounded-3xl p-8 sm:p-10 mb-12 hover-float">
          <UploadForm onUpload={handleUpload} uploadState={uploadState} />
        </div>

        {uploadState === 'uploading' && (
          <div className="glass-card sm:rounded-3xl text-center p-10 animation-delay-300 hover-float">
            <div className="w-16 h-16 mx-auto relative">
              <div className="absolute inset-0 rounded-full border-t-2 border-b-2 border-morandiBlue-400 animate-spin"></div>
              <div className="absolute inset-3 rounded-full border-t-2 border-b-2 border-morandiPink-300 animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
            </div>
            <p className="mt-6 text-morandi-600 font-medium">Uploading your document...</p>
          </div>
        )}

        {uploadState === 'processing' && (
          <div className="glass-card sm:rounded-3xl text-center p-10 animation-delay-300 hover-float">
            <div className="w-16 h-16 mx-auto relative">
              <div className="absolute inset-0 rounded-full border-t-2 border-b-2 border-morandiBlue-400 animate-spin"></div>
              <div className="absolute inset-3 rounded-full border-t-2 border-b-2 border-morandiPink-300 animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
            </div>
            <p className="mt-6 text-morandi-600 font-medium">Processing your document with AI...</p>
            <p className="mt-3 text-sm text-morandi-500">This may take a few minutes for complex documents</p>
          </div>
        )}

        {uploadState === 'error' && error && (
          <div className="glass-card sm:rounded-3xl overflow-hidden mb-12 hover-float">
            <div className="bg-morandiPink-100 border-l-4 border-morandiPink-400 p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-morandiPink-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-morandiPink-800">
                    Processing Error
                  </h3>
                  <div className="mt-2 text-sm text-morandiPink-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {uploadState === 'success' && result && (
          <div className="mt-16">
            <div className="flex items-center mb-8">
              <div className="h-px flex-1 bg-morandi-200"></div>
              <h2 className="mx-4 font-display text-2xl text-morandi-700">Analysis Results</h2>
              <div className="h-px flex-1 bg-morandi-200"></div>
            </div>
            
            <div className="glass-card sm:rounded-3xl p-1 overflow-hidden hover-float">
              <ResultDisplay result={result} />
            </div>
            
            {/* AI 聊天按钮 */}
            <div className="mt-8 text-center">
              <button 
                onClick={() => setShowChat(!showChat)}
                className="morandi-button py-2.5 px-5 flex items-center mx-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-1.503-3.247A6.5 6.5 0 117.5 3.497a6.5 6.5 0 019.997 3.256zM10 11a1 1 0 100-2 1 1 0 000 2zm-1-7a1 1 0 011-1h.01a1 1 0 010 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                {showChat ? 'Hide AI Assistant' : 'Ask AI about this document'}
              </button>
            </div>
            
            {/* AI 聊天组件 */}
            <AIChat 
              ocrContent={extractDocumentContent()} 
              isVisible={showChat} 
            />
            
            <div className="mt-12 text-center">
              <p className="text-morandi-500 text-sm">
                Powered by Mistral AI • <span className="text-morandiBlue-400">OCR Analysis Tool</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 