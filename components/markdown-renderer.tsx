'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// 性能开关，可以动态调整
let ENABLE_TEXT_PROCESSING = true;

// 自动降级处理：当检测到性能问题时自动禁用文本处理
const autoDetectPerformanceIssues = (markdownLength: number): (() => void) => {
  // 超过一定长度的文档可能会导致性能问题
  if (markdownLength > 100000) {
    console.warn("[MarkdownRenderer] 检测到超大文档，自动禁用重复内容处理以提高性能");
    ENABLE_TEXT_PROCESSING = false;
  }
  
  // 为可能的性能问题设置超时保护
  const timeoutId = setTimeout(() => {
    // 如果在1秒内没有完成处理，则认为存在性能问题
    console.warn("[MarkdownRenderer] 检测到可能的性能问题，自动禁用重复内容处理");
    ENABLE_TEXT_PROCESSING = false;
  }, 1000);
  
  // 清除超时
  return () => clearTimeout(timeoutId);
};

interface MarkdownRendererProps {
  markdown: string;
}

// 预处理LaTeX中的希腊字符，将Unicode转换为LaTeX
const preprocessMath = (markdown: string): string => {
  // 如果禁用了文本处理或文本过长，跳过处理
  if (!ENABLE_TEXT_PROCESSING || markdown.length > 50000) {
    return markdown;
  }

  // 将Unicode希腊字符映射到对应的LaTeX命令
  const greekMappings: Record<string, string> = {
    'Α': '\\Alpha',
    'Β': '\\Beta',
    'Γ': '\\Gamma',
    'Δ': '\\Delta',
    'Ε': '\\Epsilon',
    'Ζ': '\\Zeta',
    'Η': '\\Eta',
    'Θ': '\\Theta',
    'Ι': '\\Iota',
    'Κ': '\\Kappa',
    'Λ': '\\Lambda',
    'Μ': '\\Mu',
    'Ν': '\\Nu',
    'Ξ': '\\Xi',
    'Ο': '\\Omicron',
    'Π': '\\Pi',
    'Ρ': '\\Rho',
    'Σ': '\\Sigma',
    'Τ': '\\Tau',
    'Υ': '\\Upsilon',
    'Φ': '\\Phi',
    'Χ': '\\Chi',
    'Ψ': '\\Psi',
    'Ω': '\\Omega',
    'α': '\\alpha',
    'β': '\\beta',
    'γ': '\\gamma',
    'δ': '\\delta',
    'ε': '\\epsilon',
    'ζ': '\\zeta',
    'η': '\\eta',
    'θ': '\\theta',
    'ι': '\\iota',
    'κ': '\\kappa',
    'λ': '\\lambda',
    'μ': '\\mu',
    'ν': '\\nu',
    'ξ': '\\xi',
    'ο': '\\omicron',
    'π': '\\pi',
    'ρ': '\\rho',
    'σ': '\\sigma',
    'τ': '\\tau',
    'υ': '\\upsilon',
    'φ': '\\phi',
    'χ': '\\chi',
    'ψ': '\\psi',
    'ω': '\\omega'
  };

  try {
    // 查找数学块并处理内容
    return markdown.replace(/(\$\$|\$)([\s\S]*?)(\$\$|\$)/g, (match, start, content, end) => {
      // 处理LaTeX格式问题
      let processedContent = content;
      
      // 1. 修复希腊字符
      for (const [unicodeChar, latexCommand] of Object.entries(greekMappings)) {
        processedContent = processedContent.replaceAll(unicodeChar, latexCommand);
      }
      
      // 2. 修复LaTeX中的特殊字符转义
      processedContent = processedContent
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
        .replace(/(\d+(?:\.\d+)?)\s+(\\[%])/g, '$1$2')
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
    console.error("[MarkdownRenderer] 处理数学公式出错", error);
    return markdown;
  }
};

// 处理上标和特殊字符，防止重复显示问题，添加性能优化
const cleanupSupersAndSpecialChars = (markdown: string): string => {
  // 如果禁用了文本处理，直接返回原始文本
  if (!ENABLE_TEXT_PROCESSING) {
    return markdown;
  }

  try {
    // 首先保护表格
    const tableMap = new Map<string, string>();
    let tableCounter = 0;
    
    // 临时替换表格
    const withProtectedTables = markdown.replace(/(\|[^\n]+\|\n)((?:\|[^\n]+\|\n)+)/g, (match) => {
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
        // 只处理较短的段落，避免复杂处理，并且跳过包含base64的行和表格
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
    console.error("[MarkdownRenderer] 文本处理出错，自动禁用重复内容处理", error);
    ENABLE_TEXT_PROCESSING = false;
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

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ markdown }) => {
  const [optimizedMarkdown, setOptimizedMarkdown] = useState<string>(markdown);
  
  // 在组件加载或markdown变化时，以非阻塞方式处理内容
  useEffect(() => {
    // 重置文本处理开关（当接收新内容时）
    ENABLE_TEXT_PROCESSING = true;
    
    // 检测可能的性能问题
    const cleanup = autoDetectPerformanceIssues(markdown.length);
    
    // 使用Promise和setTimeout实现非阻塞处理
    const processMarkdownAsync = async () => {
      return new Promise<string>(resolve => {
        // 使用setTimeout让渲染线程有机会重新绘制
        setTimeout(() => {
          try {
            // 处理数学公式中的Unicode字符，并修复重复内容问题
            const processed = cleanupSupersAndSpecialChars(preprocessMath(markdown));
            resolve(processed);
          } catch (error) {
            console.error("[MarkdownRenderer] 异步处理Markdown出错", error);
            resolve(markdown); // 出错时返回原始文本
          }
        }, 0);
      });
    };
    
    // 执行异步处理
    processMarkdownAsync().then(processed => {
      setOptimizedMarkdown(processed);
    });
    
    // 清除超时保护
    return cleanup;
  }, [markdown]);
  
  return (
    <ReactMarkdown
      className="prose prose-morandi prose-sm max-w-none"
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[
        [rehypeKatex, { 
          strict: false,  // 关闭严格模式
          trust: true,    // 允许所有命令
          throwOnError: false, // 不要在错误时抛出异常
          errorColor: '#FF6B6B', // 错误文本的颜色
          macros: {       // 可以添加自定义宏
            "\\Delta": "\\mathsf{Δ}", // 为Δ字符提供特殊处理
            // 添加常用的缩写命令
            "\\%": "\\text{%}"  // 确保百分号能正确显示
          },
          output: 'html',  // 使用 HTML 输出
          displayMode: false, // 内联模式（根据 $ 或 $$ 自动判断）
          leqno: false,  // 等式编号在左边
          fleqn: false,  // 公式左对齐
          minRuleThickness: 0.05, // 最小线条厚度
          maxSize: 10,    // 最大尺寸因子
          maxExpand: 1000 // 最大展开步数
        }]
      ]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          
          if (inline) {
            return (
              <code className="text-xs bg-morandi-50 text-morandi-800 px-1.5 py-0.5 rounded font-mono" {...props}>
                {children}
              </code>
            );
          }
          
          return !inline && match ? (
            <div className="rounded-lg overflow-hidden my-4">
              <div className="bg-gray-800 px-4 py-2 text-xs text-gray-200 font-mono">
                {match[1]}
              </div>
              <SyntaxHighlighter
                language={match[1]}
                style={tomorrow as any}
                wrapLongLines
                customStyle={{ margin: 0, borderRadius: 0 }}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            </div>
          ) : (
            <code className="text-xs bg-morandi-50 text-morandi-800 px-1.5 py-0.5 rounded font-mono" {...props}>
              {children}
            </code>
          );
        },
        table({ node, ...props }) {
          return (
            <div className="overflow-x-auto rounded-lg border border-morandi-100 my-4">
              <table className="morandi-table" {...props} />
            </div>
          );
        },
        a({ node, href, children, ...props }) {
          return (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-morandiBlue-600 hover:text-morandiBlue-700 transition-colors font-medium"
              {...props}
            >
              {children}
            </a>
          );
        },
        img({ node, src, alt, ...props }) {
          return (
            <img 
              src={src} 
              alt={alt || ''} 
              className="rounded-lg max-h-64 object-contain my-2" 
              {...props} 
            />
          );
        },
        p({ node, children, ...props }) {
          return (
            <p className="my-2" {...props}>
              {children}
            </p>
          );
        },
        li({ node, children, ...props }) {
          return (
            <li className="my-1" {...props}>
              {children}
            </li>
          );
        },
        // 添加上标和下标的自定义渲染
        sup({ node, children, ...props }) {
          return (
            <sup className="text-xs relative -top-1" {...props}>
              {children}
            </sup>
          );
        },
        sub({ node, children, ...props }) {
          return (
            <sub className="text-xs relative -bottom-1" {...props}>
              {children}
            </sub>
          );
        }
      }}
    >
      {optimizedMarkdown}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer; 