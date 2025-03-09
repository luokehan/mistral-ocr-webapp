import { NextRequest, NextResponse } from 'next/server';

// 辅助函数：修复表格格式化
function fixTableFormat(markdown: string): string {
  // 确保标题格式正确 - # 后面需要有空格
  let fixed = markdown.replace(/^(#+)([^\s#])/gm, '$1 $2');
  
  // 规范化特殊的星号字符 - 处理中文和Unicode星号
  fixed = fixed.replace(/∗∗([^∗]+)∗∗/g, '**$1**');
  fixed = fixed.replace(/\*\*\s+([^*]+)\s+\*\*/g, '**$1**'); // 修复多余空格
  
  // 处理表格格式
  let lines = fixed.split('\n');
  let result = [];
  let inTable = false;
  let tableStartLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 检测表格开始 (有效的表格行应该有至少一个 | 符号)
    if (!inTable && line.startsWith('|') && line.endsWith('|') && line.includes('|', 1)) {
      inTable = true;
      tableStartLine = i;
      
      console.log(`Table detected at line ${i}: ${line}`);
      
      // 将表格头添加到结果中
      const processedHeader = line.replace(/\|\s*([^|]+)\s*\|/g, '| **$1** |');
      result.push(processedHeader);
      
      // 检查下一行是否是分隔行
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        
        // 如果下一行不是有效的分隔行，创建并添加一个
        if (!nextLine || !nextLine.startsWith('|') || 
            !nextLine.includes('-') || !nextLine.endsWith('|')) {
          
          console.log('Adding separator row for table');
          
          // 计算列数
          const columnCount = (line.match(/\|/g) || []).length - 1;
          
          // 为每一列创建一个标准分隔符
          const separatorRow = '|' + ' --- |'.repeat(columnCount);
          result.push(separatorRow);
        } else {
          // 规范化已存在的分隔行
          i++; // 移动到分隔行
          const formattedSeparator = nextLine.replace(/\|[^|]*\|/g, '| --- |');
          result.push(formattedSeparator);
        }
      }
    }
    // 如果在表格中，继续处理表格行
    else if (inTable && line.startsWith('|') && line.endsWith('|')) {
      // 处理表格内容，确保特殊字符正确显示
      const processedLine = processTableContent(line, false);
      result.push(processedLine);
    }
    // 检测表格结束
    else if (inTable) {
      inTable = false;
      tableStartLine = -1;
      if (line) result.push(line);
    }
    // 非表格内容
    else {
      result.push(lines[i]); // 保留原始行
    }
  }
  
  // 清理 Markdown 中的一些常见问题
  return result.join('\n')
    // 修复错误的下划线转义
    .replace(/\\_/g, '_')
    // 处理其他特殊字符
    .replace(/\+\/\-/g, '±')
    // 处理数学公式，优化 MathJax 渲染
    .replace(/\$([^$]+?)\$/g, (match, formula) => {
      // 优化数学公式格式，特别是去除影响 MathJax 的空格
      formula = formula
        // 修复花括号空格
        .replace(/\{\s+\}/g, '{}')
        .replace(/\{\s+([^}]+)\s+\}/g, '{$1}')
        // 重要：去除数字和符号之间的空格
        .replace(/(\d)\s*([+\-×*\/÷=<>])\s*(\d)/g, '$1$2$3')
        // 处理百分号前的空格
        .replace(/(\d)\s*%/g, '$1%')
        // 处理 \times 周围的空格
        .replace(/\s*\\times\s*/g, '\\times');
      return `$${formula}$`;
    });
}

// 优化处理表格内容的辅助函数
function processTableContent(line: string, isHeader: boolean): string {
  // 分割表格行，保留分隔符
  const cells = line.split('|').filter(Boolean);
  
  // 处理每个单元格
  for (let i = 0; i < cells.length; i++) {
    // 去除单元格前后的空格
    cells[i] = cells[i].trim();
    
    // 处理特殊的 Markdown 字符
    cells[i] = cells[i]
      // 规范化特殊的星号字符
      .replace(/∗∗([^∗]+)∗∗/g, '**$1**')
      // 移除对下划线的错误转义
      .replace(/\\_/g, '_')
      // 处理加减号，简化格式让 MathJax 处理
      .replace(/\+\/\-/g, '±');
    
    // 检查单元格是否包含数学公式，如果有，优化它们
    if (cells[i].includes('$')) {
      cells[i] = cells[i].replace(/\$(.*?)\$/g, (match, formula) => {
        // 优化公式内的空格
        const optimizedFormula = formula
          // 去除数字和符号之间的空格
          .replace(/(\d)\s*([+\-×*\/÷=<>])\s*(\d)/g, '$1$2$3')
          // 处理百分号前的空格
          .replace(/(\d)\s*%/g, '$1%')
          // 处理 \times 周围的空格
          .replace(/\s*\\times\s*/g, '\\times');
          
        return `$${optimizedFormula}$`;
      });
    }
      
    // 如果是表头单元格，加粗处理
    if (isHeader && cells[i].length > 0 && !cells[i].startsWith('**')) {
      cells[i] = `**${cells[i]}**`;
    }
  }
  
  // 重新组合表格行
  return '|' + cells.join('|') + '|';
}

// 辅助函数：处理文本上标格式
function processTextWithSuperscript(markdown: string): string {
  // 标准模式：Word${}^{2}$ => $\text{Word}^{2}$
  let processed = markdown.replace(/([A-Za-z][A-Za-z0-9\s]*)\$\{\}\^{([^}]+)}\$/g, 
    '$\\text{$1}^{$2}$');
    
  // 简单模式：Word² => $\text{Word}^{2}$
  processed = processed.replace(/([A-Za-z][A-Za-z0-9\s]*)([²³¹⁰-⁹]+)/g, 
    (match, text, sup) => {
      // 将 Unicode 上标字符转换为数字
      const supMap: {[key: string]: string} = {
        '²': '2', '³': '3', 
        '⁰': '0', '¹': '1', '⁴': '4',
        '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9'
      };
      
      // 构建上标字符串
      let supStr = '';
      for (const char of sup) {
        supStr += supMap[char] || char;
      }
      
      return `$\\text{${text}}^{${supStr}}$`;
    });
    
  return processed;
}

// 辅助函数：修复LaTeX中的双反斜杠问题
function fixLatexBackslashes(text: string): string {
  return text
    // 修复双反斜杠百分号问题 \\% -> \%
    .replace(/\\\\%/g, '\\%')
    // 修复双反斜杠和其他常见符号问题
    .replace(/\\\\([()[\]{}])/g, '\\$1')
    // 修复常见数学命令的双反斜杠
    .replace(/\\\\(mathbf|mathrm|mathit|text|textbf|textrm|textit|times|cdot)/g, '\\$1')
    // 处理数字+百分号的格式问题
    .replace(/(\d+(?:\.\d+)?)\s*\\%/g, '$1\\%')
    // 处理数字之间的空格 (如 "9 9 . 4" -> "99.4")
    .replace(/(\d)\s+(\d)/g, '$1$2')
    // 处理数字和小数点之间的空格 (如 "99 . 4" -> "99.4")
    .replace(/(\d)\s+\.\s+(\d)/g, '$1.$2')
    // 数学命令中的数字和空格问题
    .replace(/(\\(?:mathbf|mathrm|mathit|textbf|textit|textrm|text))\{([^}]*)\}/g, 
      (match: string, command: string, content: string) => {
        // 移除数字之间的空格
        const cleanedContent = content
          // 处理数字之间的空格（如 "8 0 . 7" -> "80.7"）
          .replace(/(\d)\s+(\d)/g, '$1$2')
          // 处理数字和小数点之间的空格（如 "80 . 7" -> "80.7"）
          .replace(/(\d)\s+\.\s+(\d)/g, '$1.$2')
          .replace(/(\d)\s+\./g, '$1.')
          .replace(/\.\s+(\d)/g, '.$1')
          // 处理数字和百分号之间的空格（如 "80.7 %" -> "80.7%"）
          .replace(/(\d)\s+%/g, '$1%')
          // 处理数字和反斜杠百分号之间的空格（如 "80.7 \%" -> "80.7\%"）
          .replace(/(\d)\s+(\\%)/g, '$1$2');
          
        return `${command}{${cleanedContent}}`;
      });
}

// 辅助函数：修复数学公式格式 - 适配 MathJax
function fixMathFormat(markdown: string): string {
  // 先处理文本+上标的格式
  let fixed = processTextWithSuperscript(markdown);
  
  // 处理一些常见科学符号
  fixed = fixed
    // 确保 \times 前后有空格
    .replace(/(\S)\\times(\S)/g, '$1\\times$2')
    // 确保下标正确
    .replace(/_([a-zA-Z0-9])(\s|$)/g, '_{$1}$2')
    // 处理上标
    .replace(/\^([a-zA-Z0-9])(\s|$)/g, '^{$1}$2');
  
  // 先处理特殊的上标格式
  fixed = fixed.replace(
    /\$\s*\{\s*\}\^{([^}]+)}\s*\$/g, 
    '${}^{$1}$'
  );
  
  // 处理公式中的双反斜杠问题 (例如 $99.4 \\%$ -> $99.4\%$)
  const mathDoubleBackslashRegex = /\$(.*?\\\\.*?)\$/g;
  if (mathDoubleBackslashRegex.test(fixed)) {
    fixed = fixed.replace(mathDoubleBackslashRegex, (match) => {
      // 移除$符号，处理内容，然后重新添加$符号
      return fixLatexBackslashes(match);
    });
  }
  
  // 再处理公式内容
  const mathRegex = /\$([^$]+?)\$/g;
  let match;
  let lastIndex = 0;
  let processed = '';
  
  while ((match = mathRegex.exec(fixed)) !== null) {
    // 添加公式前的文本
    processed += fixed.substring(lastIndex, match.index);
    
    // 获取公式内容
    let formula = match[1];
    
    // 处理特定的双反斜杠问题
    formula = fixLatexBackslashes(formula);
    
    // 处理公式内容 - 为 MathJax 优化
    formula = formula
      // 替换 \mathbf{} 为标准的 LaTeX 粗体命令
      .replace(/\\mathbf\{([^}]+)\}/g, '\\mathbf{$1}')
      // 修复花括号空格问题
      .replace(/\{\s+\}/g, '{}')
      // 处理花括号中的空格
      .replace(/\{\s+([^}]+)\s+\}/g, '{$1}')
      // 处理连续公式中的空格
      .replace(/\}\s+\{/g, '}{')
      // 重要：去除数字和符号之间的空格
      .replace(/(\d)\s*([+\-×*\/÷=<>])\s*(\d)/g, '$1$2$3')
      // 处理百分号前的空格
      .replace(/(\d)\s*%/g, '$1%')
      // 处理 \times 周围的空格
      .replace(/\s*\\times\s*/g, '\\times')
      // 乘法符号周围的空格
      .replace(/(\d)\s*\*\s*(\d)/g, '$1*$2');
      
    // 处理下标中可能的空格
    const subscriptRegex = /_{([^}]+)}/g;
    let subMatch;
    while ((subMatch = subscriptRegex.exec(formula)) !== null) {
      const original = subMatch[0];
      const content = subMatch[1].trim();
      if (subMatch[1] !== content) {
        formula = formula.replace(original, `_{${content}}`);
      }
    }
    
    // 处理上标中可能的空格
    const superscriptRegex = /\^{([^}]+)}/g;
    let supMatch;
    while ((supMatch = superscriptRegex.exec(formula)) !== null) {
      const original = supMatch[0];
      const content = supMatch[1].trim();
      if (supMatch[1] !== content) {
        formula = formula.replace(original, `^{${content}}`);
      }
    }
    
    // 添加处理后的公式
    processed += `$${formula}$`;
    
    // 更新索引
    lastIndex = match.index + match[0].length;
  }
  
  // 添加剩余的文本
  processed += fixed.substring(lastIndex);
  
  // 确保 $ 和 $ 之间没有多余的空格
  processed = processed.replace(/\$\s+/g, '$');
  processed = processed.replace(/\s+\$/g, '$');
  
  // 确保数学公式周围有空格，但公式内部没有不必要的空格
  processed = processed.replace(/(\S)\$(.*?)\$(\S)/g, '$1 $$$2$$ $3');
  
  return processed;
}

// 添加实用函数：带超时和重试的 fetch
async function fetchWithTimeout(url: string, options: RequestInit, timeoutSeconds = 300, retries = 2): Promise<Response> {
  const controller = new AbortController();
  const { signal } = controller;
  
  // 将 AbortSignal 添加到 options
  const fetchOptions = {
    ...options,
    signal
  };
  
  // 记录请求开始时间和详情
  const startTime = Date.now();
  const urlParts = new URL(url);
  console.log(`[${new Date().toISOString()}] Starting request to ${urlParts.origin}${urlParts.pathname} with timeout ${timeoutSeconds}s`);
  
  // 设置超时定时器
  const timeout = setTimeout(() => {
    controller.abort();
    console.warn(`[${new Date().toISOString()}] Request to ${urlParts.pathname} timed out after ${timeoutSeconds} seconds`);
  }, timeoutSeconds * 1000);
  
  // 设置进度检查
  const progressCheck = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    if (elapsedSeconds % 30 === 0) { // 每30秒记录一次
      console.log(`[${new Date().toISOString()}] Request to ${urlParts.pathname} still in progress after ${elapsedSeconds}s`);
    }
  }, 1000);
  
  try {
    let lastError: any;
    
    // 尝试指定的重试次数
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) {
          const waitTime = 2000 * Math.pow(2, attempt - 1);
          console.log(`[${new Date().toISOString()}] Retry attempt ${attempt}/${retries} for ${urlParts.pathname} after waiting ${waitTime/1000}s`);
          // 重试前等待，每次增加等待时间 (指数退避)
          await new Promise(r => setTimeout(r, waitTime));
        }
        
        // 执行请求
        const attemptStartTime = Date.now();
        console.log(`[${new Date().toISOString()}] Executing request (attempt ${attempt + 1}/${retries + 1})`);
        const response = await fetch(url, fetchOptions);
        const requestTime = Math.floor((Date.now() - attemptStartTime) / 1000);
        console.log(`[${new Date().toISOString()}] Received response in ${requestTime}s with status ${response.status}`);
        
        return response; // 成功则返回响应
      } catch (err: any) {
        lastError = err;
        const attemptDuration = Math.floor((Date.now() - startTime) / 1000);
        
        // 为错误添加更多上下文信息
        if (err.name === 'AbortError' || err.code === 'UND_ERR_HEADERS_TIMEOUT') {
          console.error(`[${new Date().toISOString()}] Request to ${urlParts.pathname} timed out after ${attemptDuration}s (attempt ${attempt + 1}/${retries + 1})`);
          err.message = `Request timed out after ${timeoutSeconds} seconds. ${err.message}`;
        } else if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
          console.error(`[${new Date().toISOString()}] Socket timeout for ${urlParts.pathname} after ${attemptDuration}s (attempt ${attempt + 1}/${retries + 1})`);
          err.message = `Network socket timed out after ${attemptDuration}s. ${err.message}`;
        } else if (err.code === 'ECONNRESET') {
          console.error(`[${new Date().toISOString()}] Connection reset for ${urlParts.pathname} after ${attemptDuration}s (attempt ${attempt + 1}/${retries + 1})`);
          err.message = `Connection was reset by the server after ${attemptDuration}s. ${err.message}`;
        } else {
          console.error(`[${new Date().toISOString()}] Fetch error for ${urlParts.pathname} after ${attemptDuration}s (attempt ${attempt + 1}/${retries + 1}):`, err);
        }
        
        // 如果不是超时错误且还有重试次数，则继续尝试
        if (!(err instanceof DOMException && err.name === 'AbortError') && 
            err.code !== 'UND_ERR_HEADERS_TIMEOUT' &&
            attempt < retries) {
          continue;
        }
        throw err; // 重新抛出最后一个错误
      }
    }
    
    // 这一行代码通常不会执行，但为安全起见添加
    throw lastError || new Error(`All ${retries + 1} attempts to fetch ${urlParts.pathname} failed`);
  } finally {
    clearTimeout(timeout); // 清理超时定时器
    clearInterval(progressCheck); // 清理进度检查
    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    console.log(`[${new Date().toISOString()}] Request to ${urlParts.pathname} finished after ${totalTime}s (success or failure)`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const apiKey = formData.get('apiKey') as string;
    const file = formData.get('file') as File;
    const includeImages = formData.get('includeImages') !== 'false'; // 新参数，默认为 true
    
    // Validate inputs
    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 400 });
    }
    
    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }
    
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    console.log('Processing file:', file.name, 'size:', file.size, 'bytes');

    try {
      // Step 1: Upload file to Mistral
      console.log('Uploading file to Mistral...');
      const uploadFormData = new FormData();
      uploadFormData.append('purpose', 'ocr');
      uploadFormData.append('file', file);
      
      const uploadResponse = await fetchWithTimeout(
        'https://api.mistral.ai/v1/files', 
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: uploadFormData,
        },
        120, // 上传文件超时设为 2 分钟
        1    // 重试 1 次
      );
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        console.error('File upload failed:', errorData);
        return NextResponse.json(
          { error: `File upload failed: ${errorData.error?.message || uploadResponse.statusText}` },
          { status: uploadResponse.status }
        );
      }
      
      const uploadData = await uploadResponse.json();
      const fileId = uploadData.id;
      
      console.log('File uploaded successfully, ID:', fileId);
      
      // Step 2: Get signed URL
      console.log('Getting signed URL...');
      const urlResponse = await fetchWithTimeout(
        `https://api.mistral.ai/v1/files/${fileId}/url`, 
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
        60,  // 获取 URL 超时设为 1 分钟
        2    // 重试 2 次
      );
      
      if (!urlResponse.ok) {
        const errorData = await urlResponse.json();
        console.error('Failed to get URL:', errorData);
        return NextResponse.json(
          { error: `Failed to get file URL: ${errorData.error?.message || urlResponse.statusText}` },
          { status: urlResponse.status }
        );
      }
      
      const urlData = await urlResponse.json();
      const signedUrl = urlData.url;
      
      console.log('Got signed URL for file processing');
      
      // Step 3: Process OCR
      console.log(`Processing OCR... File ID: ${fileId}, File size: ${file.size} bytes, Starting at: ${new Date().toISOString()}`);

      // 添加进度跟踪计时器
      const progressInterval = setInterval(() => {
        console.log(`OCR still processing... Elapsed time: ${Math.floor((Date.now() - startTime) / 1000)} seconds`);
      }, 10000); // 每10秒记录一次

      const startTime = Date.now();
      try {
        console.log('Sending OCR request to Mistral API...');
        const ocrResponse = await fetchWithTimeout(
          'https://api.mistral.ai/v1/ocr', 
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              model: 'mistral-ocr-latest',
              document: {
                type: 'document_url',
                document_url: signedUrl,
              },
              // 根据选项决定是否包含图像的 base64 编码
              include_image_base64: includeImages
            }),
          },
          600, // 增加超时时间到 10 分钟
          2    // 最多重试 2 次
        );
        
        // 清除进度计时器
        clearInterval(progressInterval);
        
        const processingTime = Math.floor((Date.now() - startTime) / 1000);
        console.log(`OCR request completed in ${processingTime} seconds. Status: ${ocrResponse.status}`);
        
        if (!ocrResponse.ok) {
          const errorData = await ocrResponse.json();
          console.error('OCR processing failed:', errorData);
          return NextResponse.json(
            { error: `OCR processing failed: ${errorData.error?.message || ocrResponse.statusText}` },
            { status: ocrResponse.status }
          );
        }
        
        // 检查响应的大小
        const contentLength = ocrResponse.headers.get('content-length');
        console.log('OCR response size:', contentLength ? `${parseInt(contentLength) / 1024} KB` : 'unknown');
        
        const ocrData = await ocrResponse.json();
        
        // 处理和修复 Markdown 格式
        if (ocrData.pages) {
          for (const page of ocrData.pages) {
            if (page.markdown) {
              // 修复表格和数学公式格式 - 简化处理以适配 MathJax
              page.markdown = fixTableFormat(page.markdown);
              page.markdown = fixMathFormat(page.markdown);
            }
          }
        }
        
        // 检查是否有 pages 和 images
        const pagesCount = ocrData.pages?.length || 0;
        let imagesCount = 0;
        let imagesWithBase64Count = 0;
        
        if (ocrData.pages) {
          for (const page of ocrData.pages) {
            if (page.images) {
              imagesCount += page.images.length;
              for (const image of page.images) {
                if (image.image_base64) {
                  imagesWithBase64Count++;
                }
              }
            }
          }
        }
        
        console.log(`OCR processing successful! Pages: ${pagesCount}, Images: ${imagesCount}, Images with base64: ${imagesWithBase64Count}`);
        
        // 返回处理后的结果
        return NextResponse.json({
          result: ocrData
        });
        
      } catch (apiError: any) {
        console.error('Mistral API error:', apiError);
        // 清除进度计时器并记录错误
        clearInterval(progressInterval);
        const processingTime = Math.floor((Date.now() - startTime) / 1000);
        console.error(`OCR request failed after ${processingTime} seconds with error:`, apiError);
        console.error(`Error details: name=${apiError.name}, code=${apiError.code}, message=${apiError.message}`);

        // 检查是否是超时错误，如果是则尝试不带图像的备选方案
        if ((apiError.name === 'AbortError' || apiError.code === 'UND_ERR_HEADERS_TIMEOUT') 
            && file.size > 1000000) { // 对于大于 1MB 的文件
          console.log('Trying fallback OCR request without image base64 data...');
          
          try {
            // 备选请求 - 不请求 base64 图像数据
            const fallbackResponse = await fetchWithTimeout(
              'https://api.mistral.ai/v1/ocr', 
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
                body: JSON.stringify({
                  model: 'mistral-ocr-latest',
                  document: {
                    type: 'document_url',
                    document_url: signedUrl,
                  },
                  include_image_base64: false // 不包含图像数据，减少响应大小
                }),
              },
              600, // 仍然给予充足时间
              1    // 只尝试一次
            );
            
            if (!fallbackResponse.ok) {
              throw new Error(`Fallback request failed with status: ${fallbackResponse.status}`);
            }
            
            const fallbackData = await fallbackResponse.json();
            
            // 处理和修复 Markdown 格式，但没有图像数据
            if (fallbackData.pages) {
              for (const page of fallbackData.pages) {
                if (page.markdown) {
                  page.markdown = fixTableFormat(page.markdown);
                  page.markdown = fixMathFormat(page.markdown);
                }
              }
            }
            
            console.log(`Fallback OCR processing successful! Pages: ${fallbackData.pages?.length || 0}, without images`);
            
            // 返回处理后的结果，但告知用户没有图像
            return NextResponse.json({
              result: fallbackData,
              warning: "由于文件较大，OCR 处理已完成但不包含图像数据。如需图像，请尝试处理更小的文件。"
            });
          } catch (fallbackError: any) {
            console.error('Fallback OCR request also failed:', fallbackError);
          }
        }
        
        // 如果备选方案失败或不适用，返回原始错误
        return NextResponse.json(
          { error: `Mistral API error: ${apiError.message || 'Unknown API error'}` },
          { status: 500 }
        );
      }
      
    } catch (error: any) {
      console.error('OCR processing error:', error);
      return NextResponse.json(
        { error: `OCR processing failed: ${error.message || 'Unknown error'}` },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('OCR processing error:', error);
    return NextResponse.json(
      { error: `OCR processing failed: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}