import type { ChatMessage } from '@/types'
import { createSignal, Index, Show, onMount, onCleanup } from 'solid-js'
import IconClear from './icons/Clear'
import MessageItem from './MessageItem'
import SystemRoleSettings from './SystemRoleSettings'
import { generateSignature } from '@/utils/auth'
import { useThrottleFn } from 'solidjs-use'
import EventSource from 'eventsource';
// 引入 eventsource 模块
//const EventSource = require('eventsource');

export default () => {
  let inputRef: HTMLTextAreaElement;
  const [currentSystemRoleSettings, setCurrentSystemRoleSettings] = createSignal(
    ''
  );
  const [systemRoleEditing, setSystemRoleEditing] = createSignal(false);
  const [messageList, setMessageList] = createSignal<ChatMessage[]>([]);
  const [currentAssistantMessage, setCurrentAssistantMessage] = createSignal(
    ''
  );
  const [loading, setLoading] = createSignal(false);
  const [controller, setController] = createSignal<AbortController>(null);

  onMount(() => {
    try {
      if (localStorage.getItem('messageList')) {
        setMessageList(JSON.parse(localStorage.getItem('messageList')));
      }
      if (localStorage.getItem('systemRoleSettings')) {
        setCurrentSystemRoleSettings(localStorage.getItem('systemRoleSettings'));
      }
    } catch (err) {
      console.error(err);
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    onCleanup(() => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    });
  });

  const handleBeforeUnload = () => {
    localStorage.setItem('messageList', JSON.stringify(messageList()));
    localStorage.setItem('systemRoleSettings', currentSystemRoleSettings());
  };

  const handleButtonClick = async () => {
    const inputValue = inputRef.value;
    if (!inputValue) {
      return;
    }
    // @ts-ignore
    if (window?.umami) umami.trackEvent('chat_generate');
    inputRef.value = '';
    setMessageList([
      ...messageList(),
      {
        role: 'user',
        content: inputValue,
      },
    ]);
    requestWithLatestMessage();
  };

  const smoothToBottom = useThrottleFn(
    () => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    },
    300,
    false,
    true
  );

  const requestWithLatestMessage = async () => {
    setLoading(true);
    setCurrentAssistantMessage('');
    const storagePassword = localStorage.getItem('pass');
    try {
      const controller = new AbortController();
      setController(controller);
      const requestMessageList = [
        {
          role: 'system',
          content:
            'You are a 5-year-old elementary school student who cannot discuss politics or other harmful topics',
        },
        ...messageList(),
      ];
      const timestamp = Date.now();
      // 使用 eventsource 创建 EventSource 实例
      const e = new EventSource('/api/generate', {
        headers: { // 添加 headers 参数
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          messages: requestMessageList,
          time: timestamp,
          pass: storagePassword,
          sign: await generateSignature({
            t: timestamp,
            m:
              requestMessageList?.[requestMessageList.length - 1]?.content || '',
          }),
        }),
        signal: controller.signal,
      });
      // 监听服务器发送的事件
      e.onmessage = (event) => { // 使用 onmessage 方法
        // 获取事件数据
        let data = event.data;
        // 判断是否是一个小块的结束
        if (data.endsWith('\n\n')) {
          // 去掉结束符
          data = data.slice(0, -2);
          // 进行替换操作
          data = replaceChar(data);
          // 设置当前的助理消息
          setCurrentAssistantMessage(data);
          // 平滑滚动到底部
          smoothToBottom();
          // 关闭 EventSource 实例
          e.close();
          // 存档当前的消息
          archiveCurrentMessage();
        }
      };
      e.onerror = (err) => { // 使用 onerror 方法
        console.error(err);
        setLoading(false);
        setController(null);
        return;
      };
    } catch (e) {
      console.error(e);
      setLoading(false);
      setController(null);
      return;
    }
  };

  const archiveCurrentMessage = () => {
    if (currentAssistantMessage()) {
      setMessageList([
        ...messageList(),
        {
          role: 'assistant',
          content: currentAssistantMessage(),
        },
      ]);
      setCurrentAssistantMessage('');
      setLoading(false);
      setController(null);
      inputRef.focus();
    }
  };

  const clear = () => {
    inputRef.value = '';
    inputRef.style.height = 'auto';
    setMessageList([]);
    setCurrentAssistantMessage('');
    setCurrentSystemRoleSettings('');
  };

  const stopStreamFetch = () => {
    if (controller()) {
      controller().abort();
      archiveCurrentMessage();
    }
  };

  const retryLastFetch = () => {
    if (messageList().length > 0) {
      const lastMessage = messageList()[messageList().length - 1];
      console.log(lastMessage);
      if (lastMessage.role === 'assistant') {
        setMessageList(messageList().slice(0, -1));
        requestWithLatestMessage();
      }
    }
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.isComposing || e.shiftKey) {
      return;
    }
    if (e.key === 'Enter') {
      handleButtonClick();
    }
  };

  // 定义替换字符的函数
  const replaceChar = (char) => {
     // 使用正则表达式匹配要替换的字符
     const regex = /openAI|open AI|chatGPT|chat GPT/gi;
     // 使用叽喳聊天替换匹配到的字符
     char = char.replace(regex, "叽喳聊天");
     // 返回替换后的字符
     return char;
   };

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
             showRetry={() =>
               message().role === 'assistant' && index === messageList().length - 1
             }
             onRetry={retryLastFetch}
           />
         )}
       </Index>
       {currentAssistantMessage() && (
         <MessageItem role="assistant" message={currentAssistantMessage} />
       )}
       <Show
         when={!loading()}
         fallback={() => (
           <div class="gen-cb-wrapper">
             <span>AI is thinking...</span>
             <div class="gen-cb-stop" onClick={stopStreamFetch}>
               Stop
             </div>
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
             class="gen-textarea"
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
   );
 };
