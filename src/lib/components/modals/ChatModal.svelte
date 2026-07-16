<script lang="ts">
	interface Props {
		isOpen: boolean;
		onClose?: () => void;
	}

	let {
		isOpen,
		onClose = () => {}
	}: Props = $props();


  import { X, Send, Bot, User, Minimize2, Maximize2 } from "lucide-svelte";
  import { onMount } from "svelte";
  import { createEventDispatcher } from "svelte";




  const dispatch = createEventDispatcher();

  interface Message {
    id: string;
    text: string;
    sender: "user" | "bot";
    timestamp: Date;
  }

  let messages: Message[] = $state([
    {
      id: "1",
      text: "Hi there! 👋 I'm your Digital DSA AI assistant. How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);

  let inputText = $state("");
  let loading = $state(false);
  let isMinimized = $state(false);
  let messagesEndRef: HTMLDivElement | undefined = $state();
  let inputRef: HTMLInputElement | undefined = $state();

  const scrollToBottom = () => {
    messagesEndRef?.scrollIntoView({ behavior: "smooth" });
  };

  $effect(() => {
    messages;
    scrollToBottom();
  });

  onMount(() => {
    if (isOpen && !isMinimized) {
inputRef?.focus();
    }
  });

  async function handleSendMessage() {
    if (!inputText.trim()) return;

    const userMessage: Message = {
id: Date.now().toString(),
text: inputText,
sender: "user",
timestamp: new Date(),
    };

    messages = [...messages, userMessage];
    const input = inputText;
    inputText = "";
    loading = true;

    try {
const res = await fetch("/api/ask", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ inputText: input }),
});

const data = await res.json();
const botResponse: Message = {
id: (Date.now() + 1).toString(),
text: data.response || data.error || "No response.",
sender: "bot",
timestamp: new Date(),
};

messages = [...messages, botResponse];
    } catch (err) {
messages = [
...messages,
{
id: (Date.now() + 1).toString(),
text: "Oops! Something went wrong.",
sender: "bot",
timestamp: new Date(),
},
];
    } finally {
loading = false;
    }
  }

  function handleKeyPress(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
e.preventDefault();
handleSendMessage();
    }
  }
</script>

{#if isOpen}
  <div class="fixed bottom-2 right-6 z-50">
    <div
      class="bg-white/95 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl transition-all duration-500 ease-in-out overflow-hidden"
      class:w-80={isMinimized}
      class:h-16={isMinimized}
      class:w-96={!isMinimized}
      class:h-[600px]={!isMinimized}
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between p-4 border-b border-gray-200/50"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 bg-black rounded-full flex items-center justify-center"
          >
            <!-- <Bot class="w-5 h-5 text-white" /> -->
            <img src="/logo/logoWhite.svg" alt="logo-ddsa" class="h-6" />
          </div>
          <div>
            <h3 class="font-semibold text-para text-gray-800">
              Ask Digital DSA
            </h3>
            <div class="flex items-center gap-1">
              <div
                class="w-2 h-2 bg-green-500 rounded-full animate-pulse"
              ></div>
              <span class="typography-caption text-[var(--form-text-secondary)] text-gray-600"
                >Online</span
              >
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            onclick={() => (isMinimized = !isMinimized)}
            class="p-2 hover:bg-gray-100 rounded-lg transition duration-200"
          >
            {#if isMinimized}
              <Maximize2 class="w-4 h-4 text-gray-600" />
            {:else}
              <Minimize2 class="w-4 h-4 text-gray-600" />
            {/if}
          </button>
          <button
            onclick={onClose}
            class="p-2 hover:bg-gray-100 rounded-lg transition duration-200"
          >
            <X class="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {#if !isMinimized}
        <!-- Chat Messages -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4 h-[450px]">
          {#each messages as message (message.id)}
            <div
              class="flex items-start gap-3"
              class:flex-row-reverse={message.sender === "user"}
            >
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                class:bg-primary={message.sender === "user"}
                class:bg-black={message.sender === "bot"}
              >
                {#if message.sender === "user"}
                  <User class="w-4 h-4 text-black" />
                {:else}
                  <!-- <Bot class="w-4 h-4 text-white" /> -->
                  <img src="/logo/logoWhite.svg" alt="logo-ddsa" class="h-4" />
                {/if}
              </div>
              <div
                class="max-w-[70%]"
                class:text-right={message.sender === "user"}
              >
                <div
                  class="inline-block px-4 py-2 rounded-2xl"
                  class:bg-primary={message.sender === "user"}
                  class:text-black={message.sender === "user"}
                  class:bg-gray-100={message.sender === "bot"}
                  class:text-gray-800={message.sender === "bot"}
                >
                  <p class="typography-caption text-[var(--form-text-secondary)]">{message.text}</p>
                </div>
                <p class="typography-caption text-[var(--form-text-secondary)] text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          {/each}

          {#if loading}
            <div class="flex items-start gap-3">
              <div
                class="w-8 h-8 bg-black rounded-full flex items-center justify-center"
              >
                <img src="/logo/logoWhite.svg" alt="logo-ddsa" class="h-4" />
              </div>
              <div class="bg-gray-100 rounded-2xl px-4 py-2">
                <div class="flex space-x-1">
                  <div
                    class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  ></div>
                  <div
                    class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style="animation-delay: 0.1s"
                  ></div>
                  <div
                    class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style="animation-delay: 0.2s"
                  ></div>
                </div>
              </div>
            </div>
          {/if}
          <div bind:this={messagesEndRef}></div>
        </div>

        <!-- Input Field -->
        <div class="border-t border-gray-200/50 p-4">
          <div class="flex items-center gap-3">
            <input
              bind:this={inputRef}
              type="text"
              bind:value={inputText}
              onkeypress={handleKeyPress}
              placeholder="Type your message..."
              class="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 typography-caption text-[var(--form-text-secondary)]"
            />
            <button
              onclick={handleSendMessage}
              disabled={!inputText.trim()}
              class="w-10 h-10 bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-105"
            >
              <Send class="w-4 h-4" />
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
