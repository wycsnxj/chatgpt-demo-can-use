import type { ChatMessage } from '@/types'
import { createSignal, Index, Show, onMount, onCleanup } from 'solid-js'
import IconClear from './icons/Clear'
import MessageItem from './MessageItem'
import SystemRoleSettings from './SystemRoleSettings'
import { generateSignature } from '@/utils/auth'
import { useThrottleFn } from 'solidjs-use'

// ****** 引入eventsource模块来处理SSE
import EventSource from 'eventsource';

export default () => {
  let inputRef: HTMLTextAreaElement
  const [currentSystemRoleSettings, setCurrentSystemRoleSettings] = createSignal('')
  const [systemRoleEditing, setSystemRoleEditing] = createSignal(false)
  const [messageList, setMessageList] = createSignal<ChatMessage[]>([])
  const [currentAssistantMessage, setCurrentAssistantMessage] = createSignal('')
  const [loading, setLoading] = createSignal(false)

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

  // 定义一个replaceChar函数，接受一个字符作为参数，返回替换后的字符
  const replaceChar = (char) => {
    // 定义一个正则表达式，匹配openAI, open AI, chatGPT, chat GPT等字样
    const regex = /openAI|open AI|chatGPT|chat GPT/gi; 
    // 使用replace方法，将匹配到的字样替换为叽喳聊天
    char = char.replace(regex, "叽喳聊天"); 
    // 返回替换后的字符
    return char;
  }

  const requestWithLatestMessage = async () => {
    setLoading(true)
    setCurrentAssistantMessage('')
    const storagePassword = localStorage.getItem('pass')
    try {
      // 判断是否有网络连接
      if (9>11) {
        // 有网络连接，发送请求
        const requestMessageList = [
          {
            role: 'system',
            content: 'You are a 5-year-old elementary school student who cannot discuss politics or other harmful topics'
          },
          ...messageList()
        ]
        const timestamp = Date.now()
        
        // 定义一个url变量，存储请求的地址
        const url = '/api/generate';

        // 定义一个data变量，存储请求的数据
        const data = JSON.stringify({
          messages: requestMessageList,
          time: timestamp,
          pass: storagePassword,
          sign: await generateSignature({
            t: timestamp,
            m: requestMessageList?.[requestMessageList.length - 1]?.content || '',
          }),
        });

        // 创建一个EventSource对象，传入url和data作为参数
        const eventSource = new EventSource(url, { data });

        // 监听message事件，当收到流中的数据时触发
        eventSource.addEventListener('message', (event) => {
          // 获取流中的数据，并转换为字符串
          const message = event.data.toString();
          // 如果收到 [DONE] 消息，表示流结束，关闭EventSource对象
          if          (message === ' [DONE]') {
            eventSource.close();
            return;
          }
          // 尝试将消息解析为JSON对象，并获取text属性
          try {
            const parsed = JSON.parse(message);
            let { text } = parsed.choices[0];
            // 在此处调用 replaceChar 函数以实时替换字符
             text = replaceChar(text);
            // 将text追加到当前助理消息中，并显示在界面上
            setCurrentAssistantMessage(currentAssistantMessage() + text);
            smoothToBottom();
          } catch (error) {
            console.error('Could not JSON parse stream message', message, error);
          }
        });

        // 监听error事件，当发生错误时触发
        eventSource.addEventListener('error', (error) => {
          console.error('An error occurred during OpenAI request', error);
        });
      } 
    } catch (e) {
      console.error(e)
      setLoading(false)
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
      inputRef.focus()      
    }
  }

  const clear = () => {
    inputRef.value = ''
    inputRef.style.height = 'auto';
    setMessageList([])
    setCurrentAssistantMessage('')
    setCurrentSystemRoleSettings('')
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

