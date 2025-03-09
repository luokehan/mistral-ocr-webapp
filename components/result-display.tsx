'use client';

import { useState, useEffect, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import MarkdownRenderer from './markdown-renderer'; // 引入新的 Markdown 渲染组件
import { OCRResponse } from '@/lib/types';

// 性能开关，可以动态调整
let ENABLE_TEXT_PROCESSING = true;

// 自动降级处理：当检测到性能问题时自动禁用文本处理
const autoDetectPerformanceIssues = (markdownLength: number): (() => void) => {
  // 超过一定长度的文档可能会导致性能问题
  if (markdownLength > 100000) {
    console.warn("检测到超大文档，自动禁用重复内容处理以提高性能");
    ENABLE_TEXT_PROCESSING = false;
  }
  
  // 为可能的性能问题设置超时保护
  const timeoutId = setTimeout(() => {
    // 如果在1秒内没有完成处理，则认为存在性能问题
    console.warn("检测到可能的性能问题，自动禁用重复内容处理");
    ENABLE_TEXT_PROCESSING = false;
  }, 1000);
  
  // 清除超时
  return () => clearTimeout(timeoutId);
};

// 从markdown-renderer.tsx复制过来的用于处理重复内容的函数，添加性能优化
const cleanupSupersAndSpecialChars = (markdown: string): string => {
  // 如果禁用了文本处理，直接返回原始文本
  if (!ENABLE_TEXT_PROCESSING) {
    return markdown;
  }

  try {
    // 首先预处理数学公式中的特殊字符
    const mathProcessed = preprocessMathFormulas(markdown);
    
    // 首先保护表格
    const tableMap = new Map<string, string>();
    let tableCounter = 0;
    
    // 临时替换表格
    const withProtectedTables = mathProcessed.replace(/(\|[^\n]+\|\n)((?:\|[^\n]+\|\n)+)/g, (match) => {
      const placeholder = `TABLE_PLACEHOLDER_${tableCounter++}`;
      tableMap.set(placeholder, match);
      return placeholder;
    });
    
    // 首先保护所有图片的base64数据，避免被分割处理
    const imageMap = new Map<string, { altText: string | undefined; base64Data: string }>();
    let imageCounter = 0;
    
    // 临时替换base64图片标记，同时保留alt文本
    const withProtectedImages = withProtectedTables.replace(/!\[(.*?)\]\((data:image\/[^;]+;base64,[^)]+)\)/g, (match, altText, base64Data) => {
      const placeholder = `IMAGE_PLACEHOLDER_${imageCounter++}`;
      // 存储完整的图片标记信息，包括alt文本
      imageMap.set(placeholder, { altText, base64Data });
      return `![__PLACEHOLDER__](${placeholder})`;
    });
    
    // 对于大文本，需要分段处理，避免浏览器卡死
    let processed;
    if (withProtectedImages.length > 10000) {
      // 将文本分成多个段落进行处理
      const chunks = withProtectedImages.split('\n\n');
      const processedChunks = chunks.map(chunk => {
        // 只处理较短的段落，避免复杂处理，并且跳过包含base64的行
        if (chunk.length < 1000 && !chunk.includes('base64') && !chunk.includes('TABLE_PLACEHOLDER_')) {
          return processSimplePatterns(chunk);
        }
        return chunk;
      });
      processed = processedChunks.join('\n\n');
    } else {
      // 对于较短的文本，进行正常处理
      processed = processSimplePatterns(withProtectedImages);
    }
    
    // 处理恢复后的表格，修复百分比重复问题
    let result = processed;
    
    // 恢复表格，并处理表格内的重复百分比问题
    result = result.replace(/TABLE_PLACEHOLDER_\d+/g, (placeholder) => {
      let tableContent = tableMap.get(placeholder) || '';
      
      // 处理表格中的百分比重复问题
      tableContent = fixTablePercentages(tableContent);
      
      return tableContent;
    });
    
    // 恢复图片base64数据，同时保留alt文本
    return result.replace(/!\[__PLACEHOLDER__\]\((IMAGE_PLACEHOLDER_\d+)\)/g, (match, placeholder) => {
      const imageData = imageMap.get(placeholder);
      if (!imageData) return match;
      
      // 使用原始的alt文本和base64数据重建图片标记
      return `![${imageData.altText || ''}](${imageData.base64Data})`;
    });
  } catch (error) {
    // 如果发生错误，禁用文本处理并返回原始文本
    console.error("文本处理出错，自动禁用重复内容处理", error);
    ENABLE_TEXT_PROCESSING = false;
    return markdown;
  }
};

// 预处理LaTeX公式中的特殊字符转义
const preprocessMathFormulas = (markdown: string): string => {
  // 如果禁用了文本处理或文本过长，跳过处理
  if (!ENABLE_TEXT_PROCESSING || markdown.length > 50000) {
    return markdown;
  }

  try {
    // 查找数学块并处理其中的特殊字符转义
    return markdown.replace(/(\$\$|\$)([\s\S]*?)(\$\$|\$)/g, (match, start, content, end) => {
      // 处理LaTeX格式问题
      let processedContent = content
        // 处理双反斜杠百分号 \\% -> \%
        .replace(/\\\\%/g, '\\%')
        // 处理反斜杠空格百分号 \\ % -> \%
        .replace(/\\\s+%/g, '\\%')
        // 其他常见的特殊字符转义问题
        .replace(/\\\\\(/g, '\\(')
        .replace(/\\\\\)/g, '\\)')
        .replace(/\\\\\[/g, '\\[')
        .replace(/\\\\\]/g, '\\]')
        .replace(/\\\\\{/g, '\\{')
        .replace(/\\\\\}/g, '\\}')
        // 处理常见数学符号的多余反斜杠
        .replace(/\\\\times/g, '\\times')
        .replace(/\\\\cdot/g, '\\cdot')
        .replace(/\\\\text/g, '\\text')
        .replace(/\\\\mathrm/g, '\\mathrm')
        .replace(/\\\\mathbf/g, '\\mathbf')
        .replace(/\\\\mathit/g, '\\mathit')
        // 处理数字后面的多余空格（例如 "99.4 \\%" -> "99.4\\%"）
        .replace(/(\d+(?:\.\d+)?)\s+(\[%])/g, '$1$2')
        // 处理\mathbf等命令中数字间的空格（例如 "\mathbf{8 0 . 7 \%}" -> "\mathbf{80.7\%}"）
        .replace(/(\\(?:mathbf|mathrm|mathit|textbf|textit|textrm|text|boldsymbol|vec|underline))\{([^}]*)\}/g, 
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
      
      return `${start}${processedContent}${end}`;
    });
  } catch (error) {
    console.error("处理数学公式出错", error);
    return markdown;
  }
};

// 修复表格中百分比值重复的问题
const fixTablePercentages = (tableContent: string): string => {
  // 修复百分比数据重复问题 (如: "44.4\n%\n44.4%" -> "44.4%")
  return tableContent
    // 修复数字±误差值被分离后重复的情况 (例如: "6.84\n±\n0.07\n6.84±0.07" -> "6.84±0.07")
    .replace(/(\d+(?:\.\d+)?)\s*\n\s*([±])\s*\n\s*(\d+(?:\.\d+)?)\s*\n\s*\1\s*\2\s*\3/g, '$1$2$3')
    // 简单形式的错误 (例如: "6.84\n±\n0.07" -> "6.84±0.07") 
    .replace(/(\d+(?:\.\d+)?)\s*\n\s*([±])\s*\n\s*(\d+(?:\.\d+)?)/g, '$1$2$3')
    // 处理并排显示的重复 (例如: "6.84±0.07 6.84±0.07" -> "6.84±0.07")
    .replace(/(\d+(?:\.\d+)?[±]\d+(?:\.\d+)?)\s+\1/g, '$1')
    // 修复数字和百分号被分离的情况
    .replace(/(\d+(?:\.\d+)?)\s*\n\s*(%)\s*\n\s*\1\s*\2/g, '$1$2')
    // 修复常见的表格数据重复问题
    .replace(/(\|\s*[\d.]+\s*%)\s*\1/g, '$1')
    // 修复表格中的普通数据重复
    .replace(/(\|\s*[\d.]+)\s*\1/g, '$1')
    // 修复表格中的文本重复
    .replace(/(\|\s*[A-Za-z][A-Za-z\s]{1,20})\s+\1/g, '$1');
};

// 处理特定简单模式，避免复杂的正则表达式
const processSimplePatterns = (text: string): string => {
  // 跳过处理包含base64的行或表格占位符
  if (text.includes('base64') || text.includes('TABLE_PLACEHOLDER_')) {
    return text;
  }
  
  // 避免使用贪婪模式和复杂的嵌套捕获组，使用更简单的模式
  
  // 处理Nicole Pagane特定情况
  if (text.includes("Nicole Pagane")) {
    text = text.replace(/(Nicole\s+Pagane\s+2,3‡)(?:\s+Nicole\s+Pagane\s+2,3‡)+/g, "$1");
  }
  
  // 处理表格标题问题
  if (text.includes("Table") && text.includes("Mistral")) {
    text = text.replace(/(Table\s+\d+:.*?Mistral.*?)(?:\s+\1)+/g, "$1");
  }
  
  // 处理包含±符号的数据
  if (text.includes("±")) {
    // 处理分离的误差值数据 (例如: "6.84 ± 0.07" -> "6.84±0.07")
    text = text.replace(/(\d+(?:\.\d+)?)\s+([±])\s+(\d+(?:\.\d+)?)/g, "$1$2$3");
    
    // 处理重复的误差值数据 (例如: "6.84±0.07 6.84±0.07" -> "6.84±0.07")
    text = text.replace(/(\d+(?:\.\d+)?[±]\d+(?:\.\d+)?)\s+\1/g, "$1");
  }
  
  // 限制查找范围的简单替换，使用字符串分割和合并代替复杂正则
  const lines = text.split('\n');
  const processedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    // 跳过处理包含base64的行或表格行
    if (lines[i].includes('base64') || lines[i].includes('|')) {
      processedLines.push(lines[i]);
      continue;
    }
    
    // 避免添加重复行
    if (i > 0 && lines[i].trim() === lines[i-1].trim()) {
      continue;
    }
    
    // 简单替换特定模式（不使用复杂回溯）
    let line = lines[i]
      // 简单替换数字+特殊符号组合（无需复杂捕获组）
      .replace(/(\w+\s+\d+,\d+(?:[†‡§¶]|\*))\s+\1/g, "$1")
      // 处理百分比重复
      .replace(/(\d+(?:\.\d+)?)\s*(%)\s*\1\s*\2/g, "$1$2")
      // 处理误差值重复
      .replace(/(\d+(?:\.\d+)?)\s*([±])\s*(\d+(?:\.\d+)?)\s+\1\s*\2\s*\3/g, "$1$2$3");
    
    processedLines.push(line);
  }
  
  return processedLines.join('\n');
};

interface ResultDisplayProps {
  result: OCRResponse | null;
}

export default function ResultDisplay({ result }: ResultDisplayProps) {
  const [activeTab, setActiveTab] = useState<'json' | 'markdown'>('json');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [processedMarkdown, setProcessedMarkdown] = useState<string>('');
  const [processingPerformance, setProcessingPerformance] = useState<'normal' | 'degraded'>('normal');
  
  // 定义jsonContent变量到顶部，使它在整个组件中可用
  const jsonContent = result ? JSON.stringify(result, null, 2) : '';
  
  // 用于跟踪性能状态的引用
  const performanceRef = useRef({
    startTime: 0,
    endTime: 0,
    processingTime: 0
  });

  // 处理响应数据，转换为统一的 Markdown 格式
  useEffect(() => {
    if (!result) return;

    // 重置文本处理开关（当接收新结果时）
    ENABLE_TEXT_PROCESSING = true;
    
    // 记录处理开始时间
    performanceRef.current.startTime = performance.now();
    
    console.log('Processing OCR result:', result);
    let markdown = '';

    // 检查是否有分页结构
    if (result.pages && result.pages.length > 0) {
      console.log(`Processing ${result.pages.length} pages`);
      
      // 类似 Python 代码的处理逻辑
      const pageMarkdowns = result.pages.map((page, pageIndex) => {
        console.log(`Processing page ${pageIndex + 1}, images:`, page.images?.length || 0);
        let pageMarkdown = page.markdown || page.content || '';
        
        // 替换图像引用为 base64 格式
        if (page.images && page.images.length > 0) {
          page.images.forEach(image => {
            if (image.id && image.image_base64) {
              console.log(`Image ${image.id}, base64 length: ${image.image_base64.length}`);
              
              // 获取图像格式（尝试从 base64 数据中提取）
              let imageFormat = 'png';
              if (image.image_base64.startsWith('/9j/')) {
                imageFormat = 'jpeg';
              } else if (image.image_base64.startsWith('iVBORw0KGgo')) {
                imageFormat = 'png';
              }
              
              // 检查 base64 字符串是否已经包含 data:image 前缀
              let base64Data = image.image_base64;
              if (!base64Data.startsWith('data:image/')) {
                base64Data = `data:image/${imageFormat};base64,${base64Data}`;
              }
              
              // 尝试多种可能的图像引用格式
              const possiblePatterns = [
                `![${image.id}](${image.id})`,
                `![图片](${image.id})`,
                `![Image](${image.id})`,
                `![image](${image.id})`,
                `![](${image.id})`
              ];
              
              // 替换所有可能的引用
              possiblePatterns.forEach(pattern => {
                if (pageMarkdown.includes(pattern)) {
                  console.log(`Found and replacing pattern: ${pattern}`);
                  pageMarkdown = pageMarkdown.replace(pattern, `![Image ${image.id}](${base64Data})`);
                }
              });
            }
          });
        }
        
        return `# Page ${pageIndex + 1}\n\n${pageMarkdown}`;
      });
      
      // 合并所有页面的 Markdown
      markdown = pageMarkdowns.join('\n\n');
    } else {
      // 旧结构处理逻辑
      let rawContent = (result.document && (result.document.markdown || result.document.content)) || 
                     (result.content || result.markdown || JSON.stringify(result, null, 2));
      
      markdown = rawContent;
    }
    
    // 检测可能的性能问题
    const cleanup = autoDetectPerformanceIssues(markdown.length);
    
    try {
      // 应用清理函数处理重复内容
      const cleanedMarkdown = cleanupSupersAndSpecialChars(markdown);
      
      // 记录处理结束时间
      performanceRef.current.endTime = performance.now();
      performanceRef.current.processingTime = 
        performanceRef.current.endTime - performanceRef.current.startTime;
      
      // 如果处理时间过长，标记为性能降级
      if (performanceRef.current.processingTime > 500) {
        console.warn(`文本处理耗时 ${performanceRef.current.processingTime.toFixed(2)}ms，性能可能受影响`);
        setProcessingPerformance('degraded');
      } else {
        setProcessingPerformance('normal');
      }
      
      console.log('Final markdown length:', cleanedMarkdown.length);
      setProcessedMarkdown(cleanedMarkdown);
    } catch (err) {
      console.error('处理Markdown时出错:', err);
      // 发生错误时直接使用原始Markdown
      console.log('使用原始Markdown (未处理重复内容)');
      setProcessedMarkdown(markdown);
      setProcessingPerformance('degraded');
    }
    
    // 清除超时保护
    return cleanup;
  }, [result]);

  // 处理大型内容，可能需要分块处理
  const processLargeContent = (content: string, maxChunkSize = 100000): string => {
    // 如果内容不是很大，直接返回
    if (content.length <= maxChunkSize) {
      return content;
    }
    
    console.log(`内容过大 (${content.length} 字符)，将进行优化...`);
    
    // 对于大型内容，尝试减少图片的base64数据
    let processed = content;
    
    // 替换大型base64图片数据为占位符 (仅用于复制或下载时)
    processed = processed.replace(/(!\[.*?\])\(data:image\/[^;]+;base64,[a-zA-Z0-9+/=]{10000,}\)/g, 
      '$1(大图片数据已优化，请查看原始结果)');
    
    console.log(`处理后的内容大小: ${processed.length} 字符`);
    return processed;
  };

  // 完全移除所有base64内容的函数
  const removeAllBase64Content = (content: string): string => {
    console.log(`处理前内容大小: ${content.length} 字符`);
    
    // 替换所有base64图片为简短描述
    let processed = content;
    
    // 替换所有Markdown图片格式的base64
    processed = processed.replace(/!\[(.*?)\]\(data:image\/[^;]+;base64,[^)]+\)/g, 
      (match, altText) => `![${altText || '图片'}](图片已移除)`);
    
    // 替换可能的HTML <img>标签中的base64
    processed = processed.replace(/<img[^>]*src="data:image\/[^;]+;base64,[^"]+"/g, 
      '<img src="图片已移除"');
    
    // 替换其他可能的base64模式
    processed = processed.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]{100,}/g, 
      '(base64数据已移除)');
    
    console.log(`处理后内容大小: ${processed.length} 字符`);
    return processed;
  };

  const handleCopy = async (content: string, removeBase64 = false) => {
    try {
      console.log('开始复制过程...');
      // 根据参数决定是否移除base64内容
      const contentToProcess = removeBase64 
        ? removeAllBase64Content(content) 
        : processLargeContent(content);
      
      console.log(`准备复制内容，处理后大小: ${contentToProcess.length} 字符`);
      
      // 使用 Clipboard API 的 writeText 方法
      if (navigator.clipboard && window.isSecureContext) {
        try {
          console.log('使用Clipboard API复制');
          await navigator.clipboard.writeText(contentToProcess);
          console.log('Clipboard API复制成功');
          setCopyStatus('copied');
          setTimeout(() => setCopyStatus('idle'), 2000);
        } catch (clipboardErr) {
          console.error('Clipboard API复制失败:', clipboardErr);
          // 尝试备用方法
          throw new Error('Clipboard API失败，尝试使用备用方法');
        }
      } else {
        // 尝试使用Selection API复制（可能在某些浏览器/环境中更可靠）
        try {
          console.log('尝试使用Selection API复制');
          
          // 创建一个临时的pre元素（保留格式）
          const pre = document.createElement('pre');
          pre.textContent = contentToProcess;
          
          // 确保元素存在于DOM中但不可见
          pre.style.position = 'fixed';
          pre.style.left = '-9999px';
          pre.style.top = '0';
          pre.setAttribute('readonly', '');
          
          document.body.appendChild(pre);
          
          // 创建range并选择内容
          const range = document.createRange();
          range.selectNode(pre);
          
          // 清除现有选择并应用新选择
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
            
            console.log('Selection设置完成，尝试复制');
            const successful = document.execCommand('copy');
            
            if (successful) {
              console.log('Selection复制成功');
              setCopyStatus('copied');
              setTimeout(() => setCopyStatus('idle'), 2000);
            } else {
              console.error('Selection复制失败');
              // 如果失败，尝试最后的备用方法
              throw new Error('Selection复制失败');
            }
            
            // 清理选择
            selection.removeAllRanges();
          } else {
            throw new Error('无法获取window.getSelection');
          }
          
          // 移除临时元素
          document.body.removeChild(pre);
        } catch (selectionErr) {
          console.error('Selection API复制失败:', selectionErr);
          
          // 最后的备选方案：使用 textarea 元素进行复制
          console.log('使用textarea备用方法复制 (document.execCommand)');
          const textArea = document.createElement('textarea');
          textArea.value = contentToProcess;
          
          // 确保 textarea 不可见但存在于 DOM 中
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          
          try {
            // 选择并复制内容
            textArea.focus();
            textArea.select();
            
            console.log('执行 document.execCommand("copy")');
            const successful = document.execCommand('copy');
            if (successful) {
              console.log('execCommand复制成功');
              setCopyStatus('copied');
              setTimeout(() => setCopyStatus('idle'), 2000);
            } else {
              console.error('execCommand复制失败');
              alert('复制失败: 执行copy命令未成功。请尝试手动选择内容并复制。');
            }
          } catch (execErr) {
            console.error('execCommand过程中出错:', execErr);
            alert(`复制出错: ${execErr instanceof Error ? execErr.message : String(execErr)}。请尝试手动选择内容。`);
          } finally {
            // 确保无论结果如何都清理DOM
            document.body.removeChild(textArea);
          }
        }
      }
    } catch (err) {
      console.error('复制内容失败:', err);
      alert(`复制失败: ${err instanceof Error ? err.message : String(err)}。请尝试手动选择内容并复制。如果内容过大，请尝试分段复制或使用下载功能。`);
    }
  };

  const handleDownload = (content: string, fileType: string, removeBase64 = false) => {
    try {
      console.log('开始下载过程...');
      // 处理大型内容，避免下载时出现问题
      const contentToProcess = removeBase64
        ? removeAllBase64Content(content)
        : processLargeContent(content, 500000); // 下载可以处理更大的内容
      
      console.log(`准备下载文件，处理后内容大小: ${contentToProcess.length} 字符`);
      
      // 创建一个临时 Blob 对象
      const blob = new Blob([contentToProcess], { 
        type: fileType === 'json' ? 'application/json' : 'text/markdown' 
      });
      
      // 检查文件大小
      const fileSizeMB = blob.size / (1024 * 1024);
      console.log(`创建Blob对象成功，文件大小: ${fileSizeMB.toFixed(2)} MB`);
      
      if (fileSizeMB > 50) {
        alert(`警告：文件大小为 ${fileSizeMB.toFixed(2)} MB，下载可能需要一些时间。`);
      }
      
      // 创建一个临时 URL
      const url = URL.createObjectURL(blob);
      console.log('创建对象URL成功:', url.substring(0, 30) + '...');
      
      // 创建一个临时链接元素
      const element = document.createElement('a');
      element.href = url;
      // 根据是否移除base64添加文件名后缀
      const filePrefix = removeBase64 ? 'text-only-' : '';
      const fileName = `${filePrefix}ocr-result-${new Date().toISOString().slice(0, 10)}.${fileType}`;
      element.download = fileName;
      console.log(`设置下载文件名: ${fileName}`);
      
      // 确保元素样式不会干扰用户体验
      element.style.position = 'fixed';
      element.style.opacity = '0';
      element.style.left = '-9999px';
      element.style.top = '-9999px';
      element.style.pointerEvents = 'none';
      
      // 添加到 DOM, 点击下载, 然后移除
      document.body.appendChild(element);
      console.log('添加临时下载元素到DOM');
      
      // 使用setTimeout确保DOM更新
      setTimeout(() => {
        try {
          console.log('触发点击事件...');
          element.click();
          console.log('点击事件已触发');
          
          // 短暂延迟后清理资源
          setTimeout(() => {
            try {
              document.body.removeChild(element);
              URL.revokeObjectURL(url);
              console.log('清理资源完成');
            } catch (cleanupErr) {
              console.error('清理资源时出错:', cleanupErr);
            }
          }, 200);
        } catch (clickErr: unknown) {
          console.error('触发点击事件失败:', clickErr);
          // 尝试备用下载方法 - 在新窗口中打开
          try {
            console.log('尝试备用下载方法...');
            const backupWindow = window.open(url, '_blank');
            if (!backupWindow) {
              throw new Error('无法打开新窗口，可能被浏览器阻止');
            }
            alert('下载链接已在新标签页中打开。请在新页面中右键并选择"另存为"来保存文件。');
            // 在一段时间后释放URL对象
            setTimeout(() => URL.revokeObjectURL(url), 60000); // 60秒后释放
          } catch (backupErr) {
            console.error('备用下载方法失败:', backupErr);
            alert(`下载失败: ${clickErr instanceof Error ? clickErr.message : String(clickErr)}. 请尝试其他浏览器或手动复制内容。`);
          }
        }
      }, 100);
    } catch (err) {
      console.error('下载过程中出错:', err);
      alert(`下载失败: ${err instanceof Error ? err.message : String(err)}。请尝试手动复制内容并保存。`);
    }
  };

  // 复制并提示保存函数
  const copyAndPromptSave = async (content: string, fileType: string, removeBase64 = false) => {
    try {
      // 根据参数决定是否移除base64内容
      const contentToProcess = removeBase64 
        ? removeAllBase64Content(content) 
        : processLargeContent(content);
      
      let copySuccess = false;
      
      // 使用 Clipboard API 的 writeText 方法
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(contentToProcess);
        copySuccess = true;
      } else {
        // 备选方案：使用 textarea 元素进行复制
        const textArea = document.createElement('textarea');
        textArea.value = contentToProcess;
        
        // 确保 textarea 不可见但存在于 DOM 中
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        
        // 选择并复制内容
        textArea.focus();
        textArea.select();
        
        copySuccess = document.execCommand('copy');
        
        // 清理
        document.body.removeChild(textArea);
      }
      
      if (copySuccess) {
        const extension = fileType === 'json' ? '.json' : '.md';
        const fileName = `ocr-result-${new Date().toISOString().slice(0, 10)}${extension}`;
        
        // 显示保存指导，提供不同操作系统的指导
        alert(`内容已复制到剪贴板！\n\n请执行以下步骤保存内容为文件：\n\n1. 打开记事本、VS Code或任何文本编辑器\n2. 粘贴内容(Ctrl+V)\n3. 另存为文件，建议文件名：${fileName}\n\n此方法在下载按钮无效时特别有用。`);
      } else {
        throw new Error('复制到剪贴板失败');
      }
    } catch (err) {
      console.error('复制内容失败:', err);
      alert(`复制失败: ${err instanceof Error ? err.message : String(err)}。请尝试手动选择内容并复制。`);
    }
  };

  // 添加键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只有当结果显示时才处理快捷键
      if (!result) return;
      
      // Ctrl+C 复制内容（只在不是表单元素活动时）
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && 
          !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) {
        e.preventDefault();
        handleCopy(activeTab === 'json' ? jsonContent : processedMarkdown);
      }
      
      // Ctrl+Shift+C 复制无图片版本（只在不是表单元素活动时）
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'c' && 
          !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) {
        e.preventDefault();
        handleCopy(activeTab === 'json' ? jsonContent : processedMarkdown, true);
      }
      
      // Ctrl+S 下载内容
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleDownload(
          activeTab === 'json' ? jsonContent : processedMarkdown,
          activeTab === 'json' ? 'json' : 'md',
          false
        );
      }
      
      // Ctrl+Shift+S 下载不含图片的纯文本版本
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 's') {
        e.preventDefault();
        handleDownload(
          activeTab === 'json' ? jsonContent : processedMarkdown,
          activeTab === 'json' ? 'json' : 'md',
          true
        );
      }
    };
    
    // 添加事件监听器
    window.addEventListener('keydown', handleKeyDown);
    
    // 清理函数
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [result, activeTab, jsonContent, processedMarkdown]);

  if (!result) return null;

  // 添加调试信息
  const debugInfo = result.pages 
    ? `${result.pages.length} pages, ${result.pages.reduce((total, page) => total + (page.images?.length || 0), 0)} images total` 
    : 'No pages structure';

  return (
    <div className="w-full bg-white/80 backdrop-blur-md rounded-2xl shadow-morandi overflow-hidden border border-morandi-100 relative">
      {/* Tab Navigation */}
      <div className="relative z-10 border-b border-morandi-100 bg-gradient-to-r from-morandi-50/80 to-white/90">
        <nav className="flex">
          <button
            className={`px-6 py-4 text-sm font-medium transition-all duration-300 relative ${
              activeTab === 'json'
                ? 'text-morandiBlue-500 font-semibold'
                : 'text-morandi-600 hover:text-morandi-800 hover:bg-morandi-50/50'
            }`}
            onClick={() => setActiveTab('json')}
          >
            <span className="relative z-10">JSON</span>
            {activeTab === 'json' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-morandiBlue-400 to-morandiPink-300"></span>
            )}
          </button>
          <button
            className={`px-6 py-4 text-sm font-medium transition-all duration-300 relative ${
              activeTab === 'markdown'
                ? 'text-morandiBlue-500 font-semibold'
                : 'text-morandi-600 hover:text-morandi-800 hover:bg-morandi-50/50'
            }`}
            onClick={() => setActiveTab('markdown')}
          >
            <span className="relative z-10">Markdown</span>
            {activeTab === 'markdown' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-morandiBlue-400 to-morandiPink-300"></span>
            )}
          </button>
          <div className="ml-auto px-4 py-4 text-xs text-morandi-500 italic">
            {debugInfo}
          </div>
        </nav>
      </div>

      {/* Content Area */}
      <div className="relative">
        {/* Action Buttons - 调整为自适应布局，在移动设备上位于顶部 */}
        <div className="sm:absolute sm:top-3 sm:right-3 sticky top-0 flex flex-wrap justify-end gap-2 z-50 p-2 bg-white/70 backdrop-blur-md rounded-lg mb-3 shadow-sm">
          <button
            onClick={() => {
              handleCopy(activeTab === 'json' ? jsonContent : processedMarkdown);
            }}
            title="复制内容 (Ctrl+C)"
            type="button"
            className="morandi-button py-1.5 px-3 text-sm flex items-center backdrop-blur-sm transition-all duration-300 hover:shadow-morandi-lg cursor-pointer select-none rounded-lg"
            style={{ pointerEvents: 'auto' }}
          >
            {copyStatus === 'copied' ? (
              <>
                <svg className="w-4 h-4 mr-1.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-white font-medium">已复制</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                复制
              </>
            )}
          </button>
          <button
            onClick={() => {
              handleCopy(activeTab === 'json' ? jsonContent : processedMarkdown, true);
            }}
            title="复制不含图片的纯文本版本 (Ctrl+Shift+C)"
            type="button"
            className="morandi-button-outline py-1.5 px-3 text-sm flex items-center backdrop-blur-sm transition-all duration-300 hover:shadow-morandi cursor-pointer select-none rounded-lg"
            style={{ pointerEvents: 'auto' }}
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            纯文本
          </button>
          <button
            onClick={() => {
              handleDownload(
                activeTab === 'json' ? jsonContent : processedMarkdown,
                activeTab === 'json' ? 'json' : 'md',
                false
              );
            }}
            title={`下载为 ${activeTab === 'json' ? 'JSON' : 'Markdown'} 文件 (Ctrl+S)`}
            type="button"
            className="morandi-button-outline py-1.5 px-3 text-sm flex items-center backdrop-blur-sm transition-all duration-300 hover:shadow-morandi cursor-pointer select-none rounded-lg"
            style={{ pointerEvents: 'auto' }}
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            下载
          </button>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 -left-10 w-24 h-24 bg-morandiBlue-200 rounded-full opacity-20 mix-blend-multiply filter blur-xl animate-pulse-slow"></div>
        <div className="absolute bottom-20 -right-10 w-32 h-32 bg-morandiPink-200 rounded-full opacity-20 mix-blend-multiply filter blur-xl animate-pulse-slow" style={{animationDelay: '1s'}}></div>

        {/* Tab Content */}
        <div className="p-6 pt-14 relative z-10">
          {activeTab === 'json' ? (
            <div className="rounded-xl overflow-hidden max-h-[70vh] overflow-y-auto bg-gradient-to-br from-morandi-50/80 to-white/80 p-1 shadow-inner">
              <SyntaxHighlighter
                language="json"
                style={tomorrow}
                customStyle={{ 
                  margin: 0, 
                  borderRadius: '0.5rem',
                  background: 'rgba(165, 153, 146, 0.04)', 
                  fontSize: '0.9rem',
                  lineHeight: 1.5
                }}
              >
                {jsonContent}
              </SyntaxHighlighter>
            </div>
          ) : (
            <div className="prose prose-morandi max-w-none max-h-[70vh] overflow-y-auto bg-gradient-to-br from-morandi-50/50 to-white/80 rounded-xl p-6 shadow-inner">
              <MarkdownRenderer markdown={processedMarkdown} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 