export type UploadState = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export interface OCRImage {
  id: string;
  page: number;
  bbox?: number[];
  image_base64?: string;
}

export interface OCRPage {
  page_num: number;
  markdown?: string;
  content?: string;
  images?: OCRImage[];
}

export interface OCRDocument {
  markdown?: string;
  content?: string;
}

export interface OCRResponse {
  pages?: OCRPage[];
  document?: OCRDocument;
  content?: string;
  markdown?: string;
}

export interface ApiError {
  error: string;
  message?: string;
  details?: string;
  processingTime?: string;
}

// 聊天消息类型
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// 聊天状态
export type ChatState = 'idle' | 'thinking' | 'responding' | 'error';

// OpenAI API 配置
export interface OpenAIConfig {
  apiKey: string;
  model: string;
  apiBaseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

// AI 聊天属性
export interface AIChatProps {
  ocrContent: string;
  isVisible: boolean;
}

// AI 聊天响应
export interface AIResponse {
  choices: {
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
    index: number;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
} 