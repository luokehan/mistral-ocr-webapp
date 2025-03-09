'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatState, OpenAIConfig, AIChatProps } from '@/lib/types';
import { callOpenAI, generateSystemPrompt, chunkOCRContent } from '@/lib/openai-service';
import MarkdownRenderer from './markdown-renderer';

export default function AIChat({ ocrContent, isVisible }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [chatState, setChatState] = useState<ChatState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<OpenAIConfig>({
    apiKey: '',
    model: 'gpt-3.5-turbo',
    apiBaseUrl: '',
    temperature: 0.7,
    maxTokens: 1500,
    topP: 1.0,
    frequencyPenalty: 0,
    presencePenalty: 0
  });
  const [isConfigVisible, setIsConfigVisible] = useState(false);
  const [isFirstInteraction, setIsFirstInteraction] = useState(true);
  const [customModel, setCustomModel] = useState<string>('');
  const [useCustomModel, setUseCustomModel] = useState<boolean>(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // 处理消息容器滚动，每次新消息时滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 从本地存储加载配置
  useEffect(() => {
    const savedConfig = localStorage.getItem('openai-config');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig(parsedConfig);
        
        // 检查是否使用预定义模型
        const isPredefinedModel = [
          'gpt-3.5-turbo', 
          'gpt-3.5-turbo-16k', 
          'gpt-4', 
          'gpt-4-turbo', 
          'gpt-4-1106-preview', 
          'gpt-4o',
          'gpt-4o-mini'
        ].includes(parsedConfig.model);
        
        // 更新自定义模型状态
        setCustomModel(parsedConfig.model);
        setUseCustomModel(!isPredefinedModel);
        
        // 如果有保存的配置，假设不是第一次交互
        setIsFirstInteraction(false);
      } catch (err) {
        console.error('Error parsing saved config:', err);
      }
    }
  }, []);

  // 处理聊天提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || chatState === 'thinking' || chatState === 'responding') {
      return;
    }
    
    // 验证 API 密钥
    if (!config.apiKey) {
      setError('请在设置中输入您的 OpenAI API 密钥');
      setIsConfigVisible(true);
      return;
    }
    
    const userMessage: ChatMessage = {
      role: 'user',
      content: input
    };
    
    // 如果是第一次交互，添加包含 OCR 内容的系统消息
    if (isFirstInteraction) {
      const systemMessage: ChatMessage = {
        role: 'system',
        content: generateSystemPrompt(chunkOCRContent(ocrContent))
      };
      
      setMessages(prev => [...prev, systemMessage, userMessage]);
      setIsFirstInteraction(false);
    } else {
      setMessages(prev => [...prev, userMessage]);
    }
    
    setInput('');
    setChatState('thinking');
    setError(null);
    
    try {
      // 准备发送到 API 的消息
      const messagesToSend: ChatMessage[] = isFirstInteraction 
        ? [
            { role: 'system', content: generateSystemPrompt(chunkOCRContent(ocrContent)) } as ChatMessage, 
            userMessage
          ]
        : [...messages, userMessage];
      
      // 调用 OpenAI API
      const response = await callOpenAI(messagesToSend, config);
      
      if (response.choices && response.choices.length > 0) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.choices[0].message.content
        };
        
        // 短暂延迟，让用户感知 AI 在思考
        setChatState('responding');
        setTimeout(() => {
          setMessages(prev => [...prev, assistantMessage]);
          setChatState('idle');
          
          // 聊天提交后聚焦输入框
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 500);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err.message);
      setChatState('error');
    }
  };

  // 处理配置更新
  const handleConfigUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('openai-config', JSON.stringify(config));
    setIsConfigVisible(false);
    setError(null);
    
    // 聚焦回输入框
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // 调整输入框高度
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  // 处理回车键提交
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  // 如果不可见，则不渲染
  if (!isVisible) {
    return null;
  }

  return (
    <div className="w-full bg-white/80 backdrop-blur-md rounded-2xl shadow-morandi-md overflow-hidden border border-morandi-100 mt-8">
      {/* 聊天头部 */}
      <div className="relative z-10 border-b border-morandi-100 bg-gradient-to-r from-morandi-50/80 to-white/90 px-4 py-3 flex items-center justify-between">
        <h3 className="text-lg font-display text-morandi-800">AI 文档助手</h3>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => setIsConfigVisible(!isConfigVisible)}
            className="text-morandi-600 hover:text-morandi-800 transition-colors p-1.5 rounded-full hover:bg-morandi-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* 配置面板 */}
      {isConfigVisible && (
        <div className="bg-morandi-50/50 p-4 animate-fadeIn">
          <form onSubmit={handleConfigUpdate} className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-morandi-700 mb-1">
                OpenAI API 密钥
              </label>
              <input
                id="apiKey"
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({...config, apiKey: e.target.value})}
                className="morandi-input w-full"
                placeholder="sk-..."
                required
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="model" className="block text-sm font-medium text-morandi-700">
                  模型
                </label>
                <div className="flex items-center">
                  <label htmlFor="useCustomModel" className="text-xs text-morandi-600 mr-2">
                    使用自定义模型
                  </label>
                  <input
                    type="checkbox"
                    id="useCustomModel"
                    checked={useCustomModel}
                    onChange={(e) => setUseCustomModel(e.target.checked)}
                    className="h-4 w-4 text-morandiBlue-500 rounded border-morandi-300 focus:ring-morandiBlue-300"
                  />
                </div>
              </div>
              
              {useCustomModel ? (
                <input
                  id="customModel"
                  type="text"
                  value={customModel}
                  onChange={(e) => {
                    setCustomModel(e.target.value);
                    if (e.target.value) {
                      setConfig({...config, model: e.target.value});
                    }
                  }}
                  className="morandi-input w-full"
                  placeholder="例如：gpt-3.5-turbo-16k, claude-3-opus-20240229"
                />
              ) : (
                <select
                  id="model"
                  value={config.model}
                  onChange={(e) => {
                    setConfig({...config, model: e.target.value});
                    // 当选择预定义模型时，更新自定义模型字段
                    setCustomModel(e.target.value);
                  }}
                  className="morandi-select w-full"
                >
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="gpt-3.5-turbo-16k">GPT-3.5 Turbo 16K</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-4-1106-preview">GPT-4 Turbo Preview</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                </select>
              )}
              <p className="mt-1 text-xs text-morandi-500">
                {useCustomModel ? "输入您需要使用的模型标识符" : "选择您想使用的模型"}
              </p>
            </div>
            
            <div>
              <label htmlFor="apiBaseUrl" className="block text-sm font-medium text-morandi-700 mb-1">
                API 基础 URL（可选）
              </label>
              <input
                id="apiBaseUrl"
                type="text"
                value={config.apiBaseUrl}
                onChange={(e) => setConfig({...config, apiBaseUrl: e.target.value})}
                className="morandi-input w-full"
                placeholder="https://api.openai.com/v1"
              />
              <p className="mt-1 text-xs text-morandi-500">
                如使用自定义端点或代理服务，可在此处修改
              </p>
            </div>
            
            <div>
              <button 
                type="button" 
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="text-sm text-morandiBlue-600 hover:text-morandiBlue-700 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-1 transition-transform ${showAdvancedOptions ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                高级选项
              </button>
              
              {showAdvancedOptions && (
                <div className="mt-3 space-y-4 border-t border-morandi-100 pt-3 animate-fadeIn">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="temperature" className="text-sm font-medium text-morandi-700">
                        温度（Temperature）: {config.temperature}
                      </label>
                      <span className="text-xs text-morandi-500">{config.temperature}</span>
                    </div>
                    <input
                      id="temperature"
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={config.temperature}
                      onChange={(e) => setConfig({...config, temperature: parseFloat(e.target.value)})}
                      className="w-full h-2 bg-morandi-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="mt-1 text-xs text-morandi-500">
                      较低的值使响应更确定，较高的值使响应更随机和创造性
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="maxTokens" className="text-sm font-medium text-morandi-700">
                        最大输出令牌（Max Tokens）
                      </label>
                      <span className="text-xs text-morandi-500">{config.maxTokens}</span>
                    </div>
                    <input
                      id="maxTokens"
                      type="number"
                      min="100"
                      max="4000"
                      step="100"
                      value={config.maxTokens}
                      onChange={(e) => setConfig({...config, maxTokens: parseInt(e.target.value)})}
                      className="morandi-input w-full"
                    />
                    <p className="mt-1 text-xs text-morandi-500">
                      限制AI回复的最大长度
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="topP" className="text-sm font-medium text-morandi-700">
                        Top P: {config.topP}
                      </label>
                      <span className="text-xs text-morandi-500">{config.topP}</span>
                    </div>
                    <input
                      id="topP"
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={config.topP}
                      onChange={(e) => setConfig({...config, topP: parseFloat(e.target.value)})}
                      className="w-full h-2 bg-morandi-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="mt-1 text-xs text-morandi-500">
                      控制输出的多样性，较低的值产生更集中的输出
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="frequencyPenalty" className="text-sm font-medium text-morandi-700">
                          频率惩罚: {config.frequencyPenalty}
                        </label>
                      </div>
                      <input
                        id="frequencyPenalty"
                        type="range"
                        min="-2"
                        max="2"
                        step="0.1"
                        value={config.frequencyPenalty}
                        onChange={(e) => setConfig({...config, frequencyPenalty: parseFloat(e.target.value)})}
                        className="w-full h-2 bg-morandi-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="presencePenalty" className="text-sm font-medium text-morandi-700">
                          存在惩罚: {config.presencePenalty}
                        </label>
                      </div>
                      <input
                        id="presencePenalty"
                        type="range"
                        min="-2"
                        max="2"
                        step="0.1"
                        value={config.presencePenalty}
                        onChange={(e) => setConfig({...config, presencePenalty: parseFloat(e.target.value)})}
                        className="w-full h-2 bg-morandi-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-morandi-500">
                    频率惩罚和存在惩罚可以减少重复，正值会降低模型重复使用相同词语的倾向
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                type="submit"
                className="morandi-button py-2 px-4"
              >
                保存设置
              </button>
              <button
                type="button"
                onClick={() => setIsConfigVisible(false)}
                className="morandi-button-outline py-2 px-4"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 聊天消息区域 */}
      <div className="px-4 py-4 h-96 overflow-y-auto bg-gradient-to-br from-morandi-50/50 to-white/80">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 mb-4 text-morandi-300">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-morandi-600 max-w-md">
              您可以询问关于文档内容的任何问题。AI 将基于 OCR 处理后的文档内容为您提供回答。
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.filter(msg => msg.role !== 'system').map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-3/4 rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-morandiBlue-100 text-morandi-800'
                      : 'bg-white shadow-morandi text-morandi-800'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-morandi prose-sm max-w-none">
                      <MarkdownRenderer markdown={msg.content} />
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            
            {/* 思考中状态 */}
            {chatState === 'thinking' && (
              <div className="flex justify-start">
                <div className="bg-white shadow-morandi text-morandi-800 rounded-2xl px-4 py-3">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-morandiBlue-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-morandiBlue-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    <div className="w-2 h-2 bg-morandiBlue-300 rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* 错误消息 */}
            {error && (
              <div className="flex justify-center">
                <div className="bg-morandiPink-100 text-morandiPink-700 rounded-xl px-4 py-3 text-sm max-w-md">
                  <p className="font-medium">发生错误：</p>
                  <p>{error}</p>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className="border-t border-morandi-100 p-4 bg-white">
        <form onSubmit={handleSubmit} className="flex items-end space-x-2">
          <div className="flex-grow relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="询问关于文档的问题..."
              className="w-full border border-morandi-200 rounded-xl p-3 pr-10 focus:outline-none focus:ring-2 focus:ring-morandiBlue-300 focus:border-transparent resize-none min-h-[42px] max-h-[150px]"
              rows={1}
              disabled={chatState !== 'idle' && chatState !== 'error'}
            />
            {chatState === 'idle' && (
              <button
                type="submit"
                className="absolute right-2 bottom-2 text-morandiBlue-500 hover:text-morandiBlue-600 p-1.5 rounded-full hover:bg-morandiBlue-50 transition-colors"
                disabled={!input.trim()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </form>
        <div className="mt-2 text-xs text-morandi-500 flex items-center">
          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>按 Enter 发送，Shift+Enter 换行</span>
        </div>
      </div>
    </div>
  );
} 