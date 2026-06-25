import { t, getLocale } from '../i18n';

// AI 模型调用服务 - 支持 API 级联网搜索（tool calling）
// 预搜索 + 多源联网搜索

// ========== 互联网搜索 ==========

// 韩小韩搜索API（国内，返回中文结果）
const searchVVhan = async (query) => {
  try {
    const res = await fetch(
      `https://api.vvhan.com/api/sou?word=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.success && Array.isArray(data.data)) {
      return data.data.slice(0, 8).map(i => i.title || '').filter(Boolean);
    }
    return null;
  } catch (e) {
    return null;
  }
};

// DuckDuckGo（备选）
const searchDuckDuckGo = async (query) => {
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    let results = [];
    if (data.AbstractText) results.push(data.AbstractText);
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      data.RelatedTopics.slice(0, 5).forEach(topic => {
        if (topic.Text) results.push(topic.Text);
        if (topic.Topics) topic.Topics.slice(0, 2).forEach(st => { if (st.Text) results.push(st.Text); });
      });
    }
    return results.length > 0 ? results.slice(0, 8) : null;
  } catch (e) {
    return null;
  }
};

// 主搜索 - 并行尝试所有搜索源
const searchWeb = async (query) => {
  const apis = [
    searchVVhan(query),
    searchDuckDuckGo(query),
  ];
  const results = await Promise.allSettled(apis);
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value && r.value.length > 0) {
      return r.value;
    }
  }
  return null;
};

// 预搜索（在调用AI模型之前执行）
export const preSearchWeb = async (question) => {
  const items = await searchWeb(question);
  if (items && items.length > 0) {
    return items.join('\n');
  }
  return null;
};

// ========== AI 模型调用（支持联网搜索）==========

let pendingAbortController = null;

export const cancelPendingRequests = () => {
  if (pendingAbortController) {
    pendingAbortController.abort();
    pendingAbortController = null;
  }
};

// 联网搜索支持矩阵
// deepseek: 专有 web_search tool 格式
// openai: 标准 function calling（但大部分 OpenAI 兼容提供商不支持搜索）
// 各模型联网搜索工具配置
// deepseek: 原生 web_search 工具
// openai/gpt: function calling web_search
// claude: web_search_20250305 内置工具
// gemini: googleSearch 内置工具
// moonshot/kimi: openai格式，支持 function calling
// mimo: openai格式，支持 function calling
// qwen: openai格式(dashscope)，支持 function calling
// doubao: openai格式(volcengine)，支持 function calling
const WEB_SEARCH_PROVIDER = {
  deepseek: 'deepseek',
  openai: 'openai',
  claude: 'claude',
  gemini: 'gemini',
};

const getWebSearchProvider = (account) => {
  const id = (account.id || '').toLowerCase();
  const model = (account.model || '').toLowerCase();
  // 按模型ID精确匹配
  if (id.includes('deepseek') || model.includes('deepseek')) return WEB_SEARCH_PROVIDER.deepseek;
  if (id.includes('claude') || account.format === 'claude') return WEB_SEARCH_PROVIDER.claude;
  if (id.includes('gemini') || account.format === 'gemini') return WEB_SEARCH_PROVIDER.gemini;
  // moonshot/kimi, mimo, qwen, doubao, openai 等均使用 openai 格式
  if (account.format === 'openai') return WEB_SEARCH_PROVIDER.openai;
  return null;
};

const buildWebSearchTools = (account) => {
  const provider = getWebSearchProvider(account);
  const id = (account.id || '').toLowerCase();
  const isMimo = id.includes('mimo');
  const isDeepSeek = id.includes('deepseek');
  switch (provider) {
    case 'deepseek':
      return null; // DeepSeek 使用 enable_search 参数，不使用 tools
    case 'openai':
      if (isMimo) {
        return [{
          type: 'web_search',
          max_keyword: 2,
          force_search: false,
          limit: 3,
        }];
      }
      return [{
        type: 'function',
        function: {
          name: 'web_search',
          description: t('ai.searchToolDesc'),
          parameters: {
            type: 'object',
            properties: { query: { type: 'string', description: t('ai.searchKeyword') } },
            required: ['query']
          }
        }
      }];
    case 'claude':
      return [{
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 5,
      }];
    case 'gemini':
      return [{ googleSearch: {} }];
    default:
      return null;
  }
};

const buildOpenAIBody = (model, messages, webSearch, account) => {
  const id = (account.id || '').toLowerCase();
  const isDeepSeek = id.includes('deepseek');
  const isMimo = id.includes('mimo');
  const tools = webSearch ? buildWebSearchTools(account) : null;
  const locale = getLocale();
  const finalMessages = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));
  // MiMo 模型对 system prompt 语言指令遵循度低，在末尾追加强制语言要求
  if (isMimo && locale === 'en') {
    finalMessages.push({ role: 'system', content: 'IMPORTANT: You MUST respond entirely in English. Do NOT use Chinese or any other language.' });
  }
  return {
    model,
    messages: finalMessages,
    temperature: 0.7,
    max_tokens: 4096,
    // DeepSeek 使用顶层 enable_search 参数
    ...(webSearch && isDeepSeek ? { enable_search: true } : {}),
    // 其他模型使用 tools 参数（DeepSeek 的 tools 为 null）
    ...(tools ? { tools, tool_choice: 'auto' } : {}),
  };
};

const buildClaudeBody = (model, messages, webSearch, account) => {
  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  const chatMessages = messages.filter(m => m.role !== 'system');
  const tools = webSearch ? buildWebSearchTools(account) : null;
  return {
    model,
    messages: chatMessages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    })),
    max_tokens: 4096,
    temperature: 0.7,
    system: systemMessage || undefined,
    ...(tools ? { tools } : {}),
  };
};

const buildGeminiBody = (messages, webSearch, account) => {
  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  const tools = webSearch ? buildWebSearchTools(account) : null;
  return {
    contents: messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
    generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    ...(systemMessage ? { systemInstruction: { parts: [{ text: systemMessage }] } } : {}),
    ...(tools ? { tools } : {}),
  };
};

const buildHeaders = (account) => {
  const headers = { 'Content-Type': 'application/json' };
  switch (account.format) {
    case 'openai': headers['Authorization'] = `Bearer ${account.apiKey}`; break;
    case 'claude': headers['x-api-key'] = account.apiKey; headers['anthropic-version'] = '2023-06-01'; break;
    case 'gemini': break;
  }
  return headers;
};

const buildUrl = (account) => {
  if (account.format === 'gemini') return `${account.apiEndpoint}?key=${account.apiKey}`;
  return account.apiEndpoint;
};

const parseOpenAIResponse = (data) => {
  const content = data.choices?.[0]?.message?.content;
  const citations = data.choices?.[0]?.message?.annotations || [];
  if (content) return { content, citations };
  // 部分模型通过 tool_calls 返回结果
  if (data.choices?.[0]?.message?.tool_calls?.length > 0) {
    const toolCalls = data.choices[0].message.tool_calls;
    for (const tc of toolCalls) {
      if (tc.function?.arguments) {
        try {
          const args = JSON.parse(tc.function.arguments);
          if (args.query || args.results || args.answer) {
            return { content: args.answer || args.results || `${t('ai.searchQuery')}${args.query}`, citations };
          }
        } catch (e) {}
      }
    }
    return { content: data.choices[0].message.content || t('ai.searchDone'), citations };
  }
  return { content: t('ai.noReply'), citations };
};

const parseClaudeResponse = (data) => {
  const content = data.content;
  if (Array.isArray(content)) {
    return content.map(c => {
      if (c.type === 'text') return c.text;
      if (c.type === 'tool_use') return t('ai.searchCalled');
      return '';
    }).join('\n');
  }
  return t('ai.noReply');
};

const parseGeminiResponse = (data) => {
  const candidates = data.candidates;
  if (candidates && candidates[0]?.content?.parts) {
    const text = candidates[0].content.parts.map(p => p.text || '').join('\n').trim();
    if (text) return text;
  }
  if (data.promptFeedback?.blockReason) {
    return `${t('ai.safetyFilter')}${data.promptFeedback.blockReason}`;
  }
  return t('ai.noReply');
};

// 调用单个 AI 模型
export const callAIModel = async (account, conversationHistory, searchContextText = null, abortSignal = null) => {
  const startTime = Date.now();
  const webSearch = account.webSearch === true;
  
  try {
    let messages;
    
    if (searchContextText) {
      const lastMsg = conversationHistory[conversationHistory.length - 1];
      const now = new Date();
      const locale = getLocale();
      const dateStr = locale.startsWith('zh') ? `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日` : `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
      messages = [
        { role: 'system', content: t('ai.systemPrompt', { date: dateStr }) },
        { role: 'user', content: t('ai.searchPrompt', { time: now.toLocaleTimeString(), searchContext: searchContextText, question: lastMsg.content }) },
      ];
    } else {
      const now = new Date();
      const locale = getLocale();
      const dateStr = locale.startsWith('zh') ? `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日` : `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
      messages = [
        { role: 'system', content: t('ai.systemPromptNoSearch', { date: dateStr }) },
        ...conversationHistory,
      ];
    }

    let body, headers, url;
    switch (account.format) {
      case 'claude':
        body = buildClaudeBody(account.model, messages, webSearch, account);
        headers = buildHeaders(account);
        url = buildUrl(account);
        break;
      case 'gemini':
        body = buildGeminiBody(messages, webSearch, account);
        headers = buildHeaders(account);
        url = buildUrl(account);
        break;
      default:
        body = buildOpenAIBody(account.model, messages, webSearch, account);
        headers = buildHeaders(account);
        url = buildUrl(account);
        break;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => controller.abort());
    }

    const response = await fetch(url, {
      method: 'POST', headers, body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const statusCode = response.status;
      const errorText = await response.text();
      let providerMsg = '';
      try { const d = JSON.parse(errorText); providerMsg = d.error?.message || d.message || ''; } catch (e) { providerMsg = errorText.substring(0, 200); }
      const errorMsg = providerMsg || `HTTP ${statusCode}`;
      const err = new Error(errorMsg);
      err.statusCode = statusCode;
      throw err;
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      throw new Error(t('ai.invalidResponse'));
    }
    let content;
    let citations = [];
    switch (account.format) {
      case 'claude': content = parseClaudeResponse(data); break;
      case 'gemini': content = parseGeminiResponse(data); break;
      default: 
        const parsed = parseOpenAIResponse(data);
        content = parsed.content || parsed;
        citations = parsed.citations || [];
        break;
    }

    const responseTime = Date.now() - startTime;
    let tokenUsage = null;
    try {
      if (account.format === 'claude') {
        tokenUsage = { input: data.usage?.input_tokens || 0, output: data.usage?.output_tokens || 0 };
      } else if (account.format === 'gemini') {
        tokenUsage = { input: data.usageMetadata?.promptTokenCount || 0, output: data.usageMetadata?.candidatesTokenCount || 0 };
      } else {
        tokenUsage = { input: data.usage?.prompt_tokens || 0, output: data.usage?.completion_tokens || 0 };
      }
    } catch (e) {}
    return { success: true, content, responseTime, model: account.model, modelName: account.name, modelId: account.id, tokenUsage, citations };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    if (error.name === 'AbortError') {
      return { success: false, content: t('ai.requestCancelled'), responseTime, model: account.model, modelName: account.name, modelId: account.id, error: true };
    }
    let errorMessage = error.message || t('ai.unknownError');
    const statusCode = error.statusCode;
    if (error.name === 'TimeoutError' || errorMessage.includes('timeout')) errorMessage = t('ai.timeout');
    else if (statusCode === 401 || errorMessage.includes('401')) errorMessage = t('ai.invalidKey');
    else if (statusCode === 429 || errorMessage.includes('429')) errorMessage = t('ai.tooFrequent');
    else if (statusCode === 403 || errorMessage.includes('403')) errorMessage = t('ai.accessDenied');
    else if (statusCode >= 500) errorMessage = t('ai.serverError');
    // 如果联网搜索参数不被模型支持，回退到无搜索模式重试
    const isToolError = errorMessage.includes('tool') || errorMessage.includes('not support')
      || errorMessage.includes('not found') || errorMessage.includes('invalid')
      || errorMessage.includes('参数') || errorMessage.includes('unsupported');
    if (webSearch && isToolError) {
      // 记录需要提示用户的模型
      const webSearchHint = {
        modelId: account.id,
        modelName: account.name,
        message: t('ai.webSearchHint', { name: account.name }),
      };
      try {
        const fallbackAccount = { ...account, webSearch: false };
        const result = await callAIModel(fallbackAccount, conversationHistory, searchContextText);
        return { ...result, webSearchHint };
      } catch (e2) {
        return { success: false, content: errorMessage, responseTime, model: account.model, modelName: account.name, modelId: account.id, error: true };
      }
    }
    return { success: false, content: errorMessage, responseTime, model: account.model, modelName: account.name, modelId: account.id, error: true };
  }
};

// 并发调用多个 AI 模型
export const callMultipleAIModels = async (accounts, conversationHistory, onModelResponse, searchContextText = null) => {
  cancelPendingRequests();
  const controller = new AbortController();
  pendingAbortController = controller;

  const enabledAccounts = accounts.filter(a => a.enabled && a.apiKey);
  if (enabledAccounts.length === 0) return [];

  const promises = enabledAccounts.map(async (account) => {
    if (controller.signal.aborted) return { success: false, content: t('ai.requestCancelled'), modelName: account.name, modelId: account.id, model: account.model, error: true, responseTime: 0 };
    const result = await callAIModel(account, conversationHistory, searchContextText, controller.signal);
    if (onModelResponse && !controller.signal.aborted) onModelResponse(result);
    return result;
  });

  const results = await Promise.allSettled(promises);
  return results.map((result, index) => {
    if (result.status === 'fulfilled') return result.value;
    return { success: false, content: `${t('ai.callFailed')}${result.reason?.message || t('ai.unknownError')}`, modelName: enabledAccounts[index].name, modelId: enabledAccounts[index].id, model: enabledAccounts[index].model, error: true, responseTime: 0 };
  });
};

// 生成汇总简报
export const generateSummary = (question, responses) => {
  const successfulResponses = responses.filter(r => r.success);
  if (successfulResponses.length === 0) {
    return { summary: t('ai.allFailed'), commonPoints: [], differences: [] };
  }
  const allContents = successfulResponses.map(r => ({ name: r.modelName, content: r.content }));
  let summary = t('ai.summaryPrefix', { question: question.substring(0, 50) + (question.length > 50 ? '...' : ''), n: successfulResponses.length });
  allContents.forEach((item, index) => {
    const shortContent = item.content.length > 200 ? item.content.substring(0, 200) + '...' : item.content;
    summary += `【${item.name}】${shortContent}\n\n`;
  });
  const times = successfulResponses.map(r => r.responseTime);
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const fastestModel = successfulResponses.find(r => r.responseTime === Math.min(...times));
  summary += t('ai.summaryStats', { time: (avgTime / 1000).toFixed(1), model: fastestModel?.modelName || t('ai.unknownError') });
  return { summary, allContents, responseStats: { total: responses.length, successful: successfulResponses.length, failed: responses.length - successfulResponses.length, avgResponseTime: avgTime, fastestModel: fastestModel?.modelName } };
};

// 测试模型连接
export const testModelConnection = async (account) => {
  const testMessage = [{ role: 'user', content: t('ai.testPrompt') }];
  try {
    const result = await callAIModel(account, testMessage, null);
    return result.success ? { success: true, message: t('ai.testSuccess'), modelName: account.name, responseTime: result.responseTime, tokenUsage: result.tokenUsage } : { success: false, message: result.content || t('ai.testFail'), modelName: account.name, tokenUsage: result.tokenUsage };
  } catch (error) {
    return { success: false, message: error.message || t('ai.testFail'), modelName: account.name };
  }
};

export default { callAIModel, callMultipleAIModels, generateSummary, testModelConnection, preSearchWeb };