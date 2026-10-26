<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
} from "vue";
import { client } from "../client";
import ReturnConfirmation from "./ReturnConfirmation.vue";

const emit = defineEmits<{ "return-updated": [] }>();
const returnPanel = ref<InstanceType<typeof ReturnConfirmation> | null>(null);

const props = defineProps<{
  session: string;
  userId: string;
  initialConversation?: string;
}>();

interface Conversation {
  conversation: string;
  other: string;
  title: string | null;
  username: string | null;
}

interface Message {
  id: string;
  sender: string;
  text: string;
  sentAt: string;
}

const conversations = ref<Conversation[]>([]);
const selected = ref(props.initialConversation ?? "");
const currentConversation = computed(() =>
  conversations.value.find((conversation) => conversation.conversation === selected.value),
);
const messages = ref<Message[]>([]);
const draft = ref("");
const error = ref("");
const busy = ref(false);
const listLoaded = ref(false);
const reading = ref(!!props.initialConversation);
const composeError = ref("");
const threadHeading = ref<HTMLElement | null>(null);

let disposed = false;
let refreshing = false;
let readVersion = 0;
let timer: ReturnType<typeof setInterval> | undefined;

async function loadList() {
  const result = await client.messages.list({
    session: props.session,
  });

  if ("error" in result) {
    throw new Error(
      `Could not load conversations: ${result.error}`,
    );
  }

  if (!disposed) {
    conversations.value = result.book.conversations;
    listLoaded.value = true;
  }
}

async function loadMessages() {
  const conversation = selected.value;
  if (!conversation) return;

  const version = ++readVersion;

  const result = await client.messages.read({
    session: props.session,
    conversation,
  });

  // Ignore responses for a screen or conversation we have left.
  if (
    disposed ||
    version !== readVersion ||
    conversation !== selected.value
  ) {
    return;
  }

  if ("error" in result) {
    throw new Error(
      `Could not load messages: ${result.error}`,
    );
  }

  messages.value = result.messages;
  reading.value = false;
}

async function refresh() {
  if (refreshing || disposed) return;
  refreshing = true;

  try {
    await loadList();
    await loadMessages();
    await returnPanel.value?.refresh();

    if (!disposed) error.value = "";
  } catch (caught) {
    if (!disposed) {
      error.value =
        caught instanceof Error
          ? caught.message
          : "Could not load messages.";
    }
  } finally {
    refreshing = false;
    if (!disposed) reading.value = false;
  }
}

async function openConversation(conversation: string) {
  if (busy.value) return;
  selected.value = conversation;
  reading.value = true;
  composeError.value = "";
  messages.value = [];
  draft.value = "";
  error.value = "";

  try {
    await loadMessages();
    await nextTick();
    threadHeading.value?.focus();
  } catch (caught) {
    error.value =
      caught instanceof Error
        ? caught.message
        : "Could not open conversation.";
  } finally {
    reading.value = false;
  }
}

async function send() {
  if (!draft.value.trim() || !selected.value) return;

  busy.value = true;
  composeError.value = "";

  try {
    const result = await client.messages.send({
    session: props.session,
    conversation: selected.value,
    text: draft.value,
    });

    if ("error" in result) {
    throw new Error(
        result.error === "INVALID_REQUEST"
        ? "Messages must contain 1–2000 characters."
        : `Could not send message: ${result.error}`,
    );
    }

    draft.value = "";
    await loadMessages();
  } catch (caught) {
    composeError.value =
      caught instanceof Error
        ? caught.message
        : "Could not send message.";
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  await refresh();

  if (!disposed) {
    // Poll while this screen is open, so incoming messages appear
    // without a browser refresh.
    timer = setInterval(() => {
      void refresh();
    }, 3000);
  }
});

onUnmounted(() => {
  disposed = true;
  readVersion++;
  if (timer) clearInterval(timer);
});
</script>

<template>
  <section>
    <header class="page-heading">
      <h2 tabindex="-1">Messages</h2>
      <p>Compare details and arrange a return.</p>
    </header>
    <p v-if="error" class="status error" role="alert">{{ error }}</p>
    <div class="message-layout">
      <section class="panel" aria-labelledby="conversations-title" :aria-busy="!listLoaded && !error">
        <div class="section-heading"><h3 id="conversations-title">Conversations</h3><button class="quiet" @click="refresh">Refresh</button></div>
        <p v-if="!listLoaded && !error" class="loading" role="status">Loading conversations…</p>
        <div v-else-if="listLoaded && !error && conversations.length === 0" class="empty-state"><strong>No conversations yet.</strong>Contact an owner from a search result or saved-record match to start one.</div>
        <ul class="conversation-list">
          <li v-for="conversation in conversations" :key="conversation.conversation">
            <button :disabled="busy" :aria-pressed="selected === conversation.conversation" @click="openConversation(conversation.conversation)">
              <strong>{{ conversation.title ?? "Earlier conversation" }}</strong>
              <span>With {{ conversation.username ?? "Unknown participant" }}</span>
            </button>
          </li>
        </ul>
      </section>
      <section class="panel thread" aria-label="Conversation">
        <template v-if="selected">
          <header class="thread-header"><h3 ref="threadHeading" tabindex="-1">{{ currentConversation?.title ?? "Conversation" }}</h3><p class="hint">With {{ currentConversation?.username ?? "your conversation partner" }}</p></header>
          <p v-if="reading" class="loading" role="status">Loading messages…</p>
          <div v-else-if="!error && messages.length === 0" class="empty-state"><strong>Start with a detail.</strong>Ask about the item to help confirm it belongs to the owner before arranging a handoff.</div>
          <div v-else class="message-feed">
            <article v-for="message in messages" :key="message.id" class="message-bubble" :class="{ mine: message.sender === userId }">
              <strong>{{ message.sender === userId ? "You" : (currentConversation?.username ?? "Other participant") }}</strong>
              <p class="message-text">{{ message.text }}</p>
              <time :datetime="message.sentAt">{{ new Date(message.sentAt).toLocaleString() }}</time>
            </article>
          </div>
          <form class="composer" @submit.prevent="send" :aria-busy="busy">
            <label for="message">Your message</label>
            <textarea id="message" v-model="draft" maxlength="2000" rows="3" aria-describedby="message-help" required :disabled="busy || reading" />
            <p id="message-help" class="hint">Up to 2,000 characters. Keep personal details private.</p>
            <p v-if="composeError" class="status error" role="alert">{{ composeError }}</p>
            <button class="primary" :disabled="busy || reading || !draft.trim()">{{ busy ? "Sending…" : "Send" }}</button>
          </form>
          <ReturnConfirmation :key="selected" ref="returnPanel" :session="session" :conversation="selected" @updated="emit('return-updated')" />
        </template>
        <div v-else class="empty-state"><strong>A conversation starts with a match.</strong>Choose a conversation to read and reply.</div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.message-layout { display: grid; grid-template-columns: minmax(240px, .7fr) minmax(0, 1.4fr); gap: 24px; align-items: start; }
.conversation-list { display: grid; gap: 8px; list-style: none; margin: 0; padding: 0; }
.conversation-list button { width: 100%; text-align: left; display: grid; gap: 4px; }
.conversation-list span { font-size: .8rem; font-weight: 400; }
.thread-header { border-bottom: 1px solid var(--line); padding-bottom: 16px; margin-bottom: 20px; }
.message-feed { display: grid; gap: 14px; max-height: 55vh; overflow-y: auto; padding: 4px; }
.message-bubble { max-width: 90%; padding: 14px 16px; background: #f0f2ed; border-radius: 12px 12px 12px 2px; }
.message-bubble.mine { margin-left: auto; background: #e5f1e8; border-radius: 12px 12px 2px 12px; }
.message-bubble strong { font-size: .8rem; }
.message-bubble time { font-size: .73rem; color: var(--muted); display: block; margin-top: 8px; }
.message-text { white-space: pre-wrap; overflow-wrap: anywhere; }
.composer { margin-top: 24px; border-top: 1px solid var(--line); padding-top: 20px; }
.composer button { justify-self: end; }
@media (max-width: 800px) { .message-layout { grid-template-columns: minmax(0, 1fr); } }
</style>
