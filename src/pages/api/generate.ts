import type { APIRoute } from 'astro'
import { generatePayload, parseOpenAIStream } from '@/utils/openAI'
import { verifySignature } from '@/utils/auth'
// #vercel-disable-blocks
import { fetch, ProxyAgent } from 'undici'
// #vercel-end

const apiKey = import.meta.env.OPENAI_API_KEY
const httpsProxy = import.meta.env.HTTPS_PROXY
const baseUrl = (import.meta.env.OPENAI_API_BASE_URL || 'https://api.openai.com').trim().replace(/\/$/,'')
const sitePassword = import.meta.env.SITE_PASSWORD

export const post: APIRoute = async (context) => {
  const body = await context.request.json()
  const { sign, time, messages, pass } = body
  if (!messages) {
    return new Response('No input text')
  }
  if (sitePassword && sitePassword !== pass) {
    return new Response('Invalid password')
  }
  if (import.meta.env.PROD && !await verifySignature({ t: time, m: messages?.[messages.length - 1]?.content || '', }, sign)) {
    return new Response('Invalid signature')
  }
  const initOptions = generatePayload(apiKey, messages)
  // #vercel-disable-blocks
  if (httpsProxy) {
    initOptions['dispatcher'] = new ProxyAgent(httpsProxy)
  }
  // #vercel-end

  // @ts-ignore

const response = await fetch(`${baseUrl}/v1/chat/completions`, initOptions) as Response;
// 使用await关键字来获取parseOpenAIStream函数的结果
const data = await parseOpenAIStream(response);
// 打印data
alert(1);
console.log(data);
// 返回一个Response对象，包含data作为响应体
return new Response(data, {
  headers: {
    'content-type': 'application/json',
  },
 });
}

// 定义一个异步函数,用来解析openAI的返回结果
const parseOpenAIStream =  (response: Response) => {
  try {
    const reader = response.getReader();
      alert(2);
      console.log(666);

    // 定义变量,存储状态
    let char = "";
    let done = false;
    let lastChar = "";
    let lastLastChar = "";
    let lastLastLastChar = "";

    // 循环读取响应,直到结束
    while (!done) {
      const { value, done: readerDone } = await reader.read();

      // 如果有值,解码并替换
      if (value) {
        char = new TextDecoder().decode(value);
        char = char.replace(/chatGPT/gi, "叽喳GPT");
        char = char.replace(/openAI/gi, "开放人工智能联盟");
      }

      // 不返回char,直接在函数内处理
      // char 重置为空字符串
      char = "";

      // 更新状态
      lastLastLastLastChar = lastLastLastChar;
      lastLastLastChar = lastLastChar;
      lastLastChar = lastChar;
      lastChar = char;
      done = readerDone;
    }
  } catch (error) {
    // 如果发生错误,打印错误信息log
    console.log(123);
    console.error(error);
  }
}


