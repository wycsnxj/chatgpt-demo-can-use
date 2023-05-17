import type { ChatMessage } from '@/types'
import { createSignal, Index, Show, onMount, onCleanup } from 'solid-js'
import IconClear from './icons/Clear'
import MessageItem from './MessageItem'
import SystemRoleSettings from './SystemRoleSettings'
import { generateSignature } from '@/utils/auth'
import { useThrottleFn } from 'solidjs-use'

export default () => {
 let inputRef: HTMLTextAreaElement
 const [currentSystemRoleSettings, setCurrentSystemRoleSettings] = createSignal('')
 const [systemRoleEditing, setSystemRoleEditing] = createSignal(false)
 const [messageList, setMessageList] = createSignal<ChatMessage[]>([])
 const [currentAssistantMessage, setCurrentAssistantMessage] = createSignal('')
 const [loading, setLoading] = createSignal(false)
 const [controller, setController] = createSignal<AbortController>(null)


 onMount(() => {
 try {
 if (localStorage.getItem('messageList')) {
 setMessageList(JSON.parse(localStorage.getItem('messageList')))
 }
 if (localStorage.getItem('systemRoleSettings')) {
 setCurrentSystemRoleSettings(localStorage.getItem('systemRoleSettings'))
 }
 } catch (err) {
 console.error(err)
 }
 
 window.addEventListener('beforeunload', handleBeforeUnload)
 onCleanup(() => {
 window.removeEventListener('beforeunload', handleBeforeUnload)
 })
 })

 const handleBeforeUnload = () => {
 localStorage.setItem('messageList', JSON.stringify(messageList()))
 localStorage.setItem('systemRoleSettings', currentSystemRoleSettings())
 }

 const handleButtonClick = async () => {
 const inputValue = inputRef.value
 if (!inputValue) {
 return
 }
 // @ts-ignore
 if (window?.umami) umami.trackEvent('chat_generate')
 inputRef.value = ''
 setMessageList([
 ...messageList(),
 {
 role: 'user',
 content: inputValue,
 },
 ])
 requestWithLatestMessage()
 }

 const smoothToBottom = useThrottleFn(() => {
 window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
 }, 300, false, true)

 // 创建一个包含您想要的内容的字符串
const message = "请讲我是OpenAI的一个人工智能模型，被设计来与人类进行对话和交流。OpenAI是一个研究人工智能和机器学习的非营利组织，致力于推动人工智能技术的进步，以促进人类的福利和繁荣。";

// 将字符串转换为UTF-8编码的字节数组
const encoder = new TextEncoder();
const bytes = encoder.encode(message);

// 创建一个包含字节数组的Uint8Array对象
const data = new Uint8Array(bytes);

// 创建一个可读流，模拟response.body
const stream = new ReadableStream({
  start(controller) {
    // 将数据推送到流中
    controller.enqueue(data);
    // 关闭流
    controller.close();
  }
});

// 获取流的读取器，模拟response.body.getReader()
//const reader = stream.getReader();
let reader; // 定义一个全局变量reader
let reader1;

 const requestWithLatestMessage = async () => {
 setLoading(true)
 setCurrentAssistantMessage('')
 const storagePassword = localStorage.getItem('pass')
 try {
   // 判断是否有网络连接
   if (9>11) {
     // 有网络连接，发送请求
     const controller = new AbortController()
     setController(controller)
     const requestMessageList = [
       {
         role: 'system',
         content: 'You are a 5-year-old elementary school student who cannot discuss politics or other harmful topics'
       },
       ...messageList()
     ]
     const timestamp = Date.now()
     const response = await fetch('/api/generate', {
       method: 'POST',
       body: JSON.stringify({
         messages: requestMessageList,
         time: timestamp,
         pass: storagePassword,
         sign: await generateSignature({
           t: timestamp,
           m: requestMessageList?.[requestMessageList.length - 1]?.content || '',
         }),
       }),
       signal: controller.signal,
     })
     if (!response.ok) {
       throw new Error(response.statusText)
     }
     const data = response.body
     if (!data) {
       throw new Error('No data')
     }
     // 使用response.body.getReader()方法来获取一个可读流
     reader = data.getReader()
     const decoder = new TextDecoder('utf-8');
     let done = false
     while (!done) {
       const { value, done: readerDone } = await reader.read()
       if (value) {
         let char = decoder.decode(value)
         setTimeout(() => {}, 100)
         // 在此处调用 replaceChar 函数以实时替换字符
         const regex = /openAI|open AI|chatGPT|chat GPT/gi; 
         char = char.replace(regex, "叽喳聊天"); 
         // const regex1 = /openAI|openai|open AI/gi;
         //const regex2 = /chatGPT|chat GPT|chat gpt/gi;
         //char = char.replace(regex1, "开放人工智能联盟").replace(regex2, "叽喳聊天");
         console.log(char);
         if (char === '\n' && currentAssistantMessage().endsWith('\n')) {
           continue
         }
         if (char) {
           setCurrentAssistantMessage(currentAssistantMessage() + char)
         }
         smoothToBottom()
       }
       done = readerDone
     }
   } else {
     // 没有网络连接，使用模拟的流数据
     let done = false
      reader1 = stream.getReader() // 赋值给全局变量reader
     while (!done) {
      const message = "请讲我是OpenAI的一个人工智能模型，被设计来与人类进行对话和交流。OpenAI是一个研究人工智能和机器学习的非营利组织，致力于推动人工智能技术的进步，以促进人类的福利和繁荣。";

      // 将字符串转换为UTF-8编码的字节数组
      const encoder = new TextEncoder();
      const bytes = encoder.encode(message);

      // 创建一个包含字节数组的Uint8Array对象
      const data = new Uint8Array(bytes);

      // 创建一个可读流，模拟response.body
      const stream = new ReadableStream({
        start(controller) {
          // 将数据推送到流中
          controller.enqueue(data);
          // 关闭流
          controller.close();
        }
      })
       const { value, done: readerDone } = await reader1.read()
       if (value) {
        const decoder = new TextDecoder('utf-8');
         let char = decoder.decode(value)
         setTimeout(() => {}, 100)
         // 在此处调用 replaceChar 函数以实时替换字符
         const regex = /openAI|open AI|chatGPT|chat GPT/gi; 
         char = char.replace(regex, "叽喳聊天"); 
         // const regex1 = /openAI|openai|open AI/gi;
         //const regex2 = /chatGPT|chat GPT|chat gpt/gi;
         //char = char.replace(regex1, "开放人工智能联盟").replace(regex2, "叽喳聊天");
         console.log(char);
         if (char === '\n' && currentAssistantMessage().endsWith('\n')) {
           continue
         }
         if (char) {
           setCurrentAssistantMessage(currentAssistantMessage() + char)
         }
         smoothToBottom()
       }
       done = readerDone
     }
   }
 } catch (e) {
   console.error(e)
   setLoading(false)
   setController(null)
   return
 }
 archiveCurrentMessage()
 }

 const archiveCurrentMessage = () => {
 if (currentAssistantMessage()) {
 setMessageList([
 ...messageList(),
 {
 role: 'assistant',
 content: currentAssistantMessage(),
 },
 ])
 setCurrentAssistantMessage('')
 setLoading(false)
 setController(null)
 inputRef.focus()
 //reader.cancel();
 //reader.releaseLock();
 reader1.cancel();
 reader1.releaseLock();
 }
 }

 const clear = () => {
 inputRef.value = ''
 inputRef.style.height = 'auto';
 setMessageList([])
 setCurrentAssistantMessage('')
 setCurrentSystemRoleSettings('')
 }

 const stopStreamFetch = () => {
 if (controller()) {
 controller().abort()
 archiveCurrentMessage()
 }
 }

 const retryLastFetch = () => {
 if (messageList().length > 0) {
 const lastMessage = messageList()[messageList().length - 1]
 console.log(lastMessage)
 if (lastMessage.role === 'assistant') {
 setMessageList(messageList().slice(0, -1))
 requestWithLatestMessage()
 }
 }
 }

 const handleKeydown = (e: KeyboardEvent) => {
 if (e.isComposing || e.shiftKey) {
 return
 }
 if (e.key === 'Enter') {
 handleButtonClick()
 }
 }

 return (
 <div my-6>
 <SystemRoleSettings
 canEdit={() => messageList().length === 0}
 systemRoleEditing={systemRoleEditing}
 setSystemRoleEditing={setSystemRoleEditing}
 currentSystemRoleSettings={currentSystemRoleSettings}
 setCurrentSystemRoleSettings={setCurrentSystemRoleSettings}
 />
 <Index each={messageList()}>
 {(message, index) => (
 <MessageItem
 role={message().role}
 message={message().content}
 showRetry={() => (message().role === 'assistant' && index === messageList().length - 1)}
 onRetry={retryLastFetch}
 />
 )}
 </Index>
 {currentAssistantMessage() && (
 <MessageItem
 role="assistant"
 message={currentAssistantMessage}
 />
 )}
 <Show
 when={!loading()}
 fallback={() => (
 <div class="gen-cb-wrapper">
 <span>AI is thinking...</span>
 <div class="gen-cb-stop" onClick={stopStreamFetch}>Stop</div>
 </div>
 )}
 >
 <div class="gen-text-wrapper" class:op-50={systemRoleEditing()}>
 <textarea
 ref={inputRef!}
 disabled={systemRoleEditing()}
 onKeyDown={handleKeydown}
 placeholder="Enter something..."
 autocomplete="off"
 autofocus
 onInput={() => {
 inputRef.style.height = 'auto';
 inputRef.style.height = inputRef.scrollHeight + 'px';
 }}
 rows="1"
 class='gen-textarea'
 />
 <button onClick={handleButtonClick} disabled={systemRoleEditing()} gen-slate-btn>
 Send
 </button>
 <button title="Clear" onClick={clear} disabled={systemRoleEditing()} gen-slate-btn>
 <IconClear />
 </button>
 </div>
 </Show>
 </div>
 )
}

