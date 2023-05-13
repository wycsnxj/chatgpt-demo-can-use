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
  const response = await fetch(`${baseUrl}/v1/chat/completions`, initOptions) as Response

  return new Response(parseOpenAIStream(response))
}

// 定义一个函数，用来解析开放人工智能联盟的返回结果
const parseOpenAIStream = async (response: Response) => {
  // 定义一个变量reader，用来获取响应的内容
  const reader = response.body.getReader();
  // 定义一些变量，用来存储字符，状态，和上一次的字符
  let char = "";
  let done = false;
  let lastChar = "";
  let lastLastChar = "";
  let lastLastLastChar = "";

  // 循环读取响应的内容，直到结束
  while (!done) {
    const { value, done: readerDone } = await reader.read();
    // 如果有值，就把它解码成字符
    if (value) {
      char += decoder.decode(value);
      // 如果字符是换行符，并且上一个字符也是换行符，就跳过
      if (char === "\n" && lastChar === "\n") {
        continue;
      }
      // 如果字符是换行符，并且上一个字符是三个或四个点号，就跳过
      if (
        char === "\n" &&
        lastChar === "." &&
        lastLastChar === "." &&
        lastLastLastChar === "."
      ) {
        continue;
      }
      if (
        char === "\n" &&
        lastChar === "." &&
        lastLastChar === "." &&
        lastLastLastChar === "." &&
        lastLastLastLastChar === "."
      ) {
        continue;
      }
      // 把chatGPT替换成叽喳GPT
      char = char.replaceAll("chatGPT", "叽喳GPT");
      // 把openAI替换成开放人工智能联盟
      char = char.replaceAll("openAI", "开放人工智能联盟"); 
      console.log("-----"+char);
      // 返回字符
      return char;
    }
    // 更新状态和上一次的字符
    done = readerDone;
    lastLastLastLastChar = lastLastLastChar;
    lastLastLastChar = lastLastChar;
    lastLastChar = lastChar;
    lastChar = char;
    char = "";
  }
}
