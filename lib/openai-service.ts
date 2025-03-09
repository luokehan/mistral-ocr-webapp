import { ChatMessage, OpenAIConfig, AIResponse } from './types';

/**
 * 调用 OpenAI API 进行聊天对话
 */
export async function callOpenAI(
  messages: ChatMessage[],
  config: OpenAIConfig
): Promise<AIResponse> {
  // 处理 API URL
  let apiUrl = 'https://api.openai.com/v1/chat/completions';
  
  if (config.apiBaseUrl) {
    // 移除末尾的斜杠，如果存在
    const baseUrl = config.apiBaseUrl.trim().replace(/\/+$/, '');
    
    // 检查是否包含完整的 URL 格式
    if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
      // 确保路径包含 /v1/chat/completions
      if (baseUrl.endsWith('/v1')) {
        apiUrl = `${baseUrl}/chat/completions`;
      } else if (baseUrl.endsWith('/v1/chat')) {
        apiUrl = `${baseUrl}/completions`;
      } else if (!baseUrl.endsWith('/v1/chat/completions')) {
        // 如果不是以 /v1/chat/completions 结尾，则添加完整路径
        apiUrl = `${baseUrl}/v1/chat/completions`.replace(/\/+/g, '/').replace('://', '://');
      } else {
        apiUrl = baseUrl;
      }
    } else {
      // 如果用户只输入了域名，添加协议和路径
      apiUrl = `https://${baseUrl}/v1/chat/completions`.replace(/\/+/g, '/').replace('://', '://');
    }
  }

  console.log('使用 API URL:', apiUrl);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: messages,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 1500,
        top_p: config.topP ?? 1.0,
        frequency_penalty: config.frequencyPenalty ?? 0,
        presence_penalty: config.presencePenalty ?? 0
      })
    });

    if (!response.ok) {
      let errorMsg = `API responded with status: ${response.status}`;
      try {
        const error = await response.json();
        errorMsg = error.error?.message || errorMsg;
      } catch (e) {
        // 如果响应不是 JSON 格式，使用默认错误信息
      }
      throw new Error(errorMsg);
    }

    return await response.json();
  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    throw new Error(`OpenAI API 调用失败: ${error.message}`);
  }
}

/**
 * 生成用于提供 OCR 文档上下文的系统消息
 */
export function generateSystemPrompt(ocrContent: string): string {
  return `你是一个AI助手，正在帮助分析以下从PDF中提取的文档内容：

---
${ocrContent}
---

请基于上述内容回答用户的问题。如果用户询问的内容不在文档中，请如实告知。回答时尽量引用文档的相关部分。保持回答简洁、友好且专业。`;
}

/**
 * 分块处理长内容（超过8000个token时）
 */
export function chunkOCRContent(ocrContent: string, maxLength: number = 8000): string {
  // 简单估算：平均每个字符约为0.5-1.0个token
  // 为安全起见，按0.5计算，即2个字符≈1个token
  if (ocrContent.length > maxLength * 2) {
    return ocrContent.substring(0, maxLength * 2) + 
      `\n\n[文档过长，已截断。当前仅展示前${maxLength}个token的内容]`;
  }
  return ocrContent;
} 