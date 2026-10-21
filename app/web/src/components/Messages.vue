<script setup lang="ts">
import {
  onMounted,
  onUnmounted,
  ref,
} from "vue";
import { api } from "../api";

const props = defineProps<{
  session: string;
  userId: string;
  initialConversation?: string;
}>();

interface Conversation {
  conversation: string;
  other: string;
}

interface Message {
  id: string;
  sender: string;
  text: string;
  sentAt: string;
}

const conversations = ref<Conversation[]>([]);
const selected = ref(props.initialConversation ?? "");
const messages = ref<Message[]>([]);
const draft = ref("");
const error = ref("");
const busy = ref(false);

let disposed = false;
let refreshing = false;
let readVersion = 0;
let timer: ReturnType<typeof setInterval> | undefined;

async function loadList() {
  const result = await api("/messages/list", props.session);

  if (!disposed) {
    conversations.value = result.book.conversations;
  }
}

async function loadMessages() {
  const conversation = selected.value;
  if (!conversation) return;

  const version = ++readVersion;

  const result = await api(
    "/messages/read",
    props.session,
    { conversation },
  );

  // Ignore a response if the user switched conversations meanwhile.
  if (
    !disposed &&
    version === readVersion &&
    conversation === selected.value
  ) {
    messages.value = result.messages;
  }
}

async function refresh() {
  if (refreshing || disposed) return;
  refreshing = true;

  try {
    await loadList();
    await loadMessages();

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
  }
}

async function openConversation(conversation: string) {
  selected.value = conversation;
  messages.value = [];
  draft.value = "";
  error.value = "";

  try {
    await loadMessages();
  } catch (caught) {
    error.value =
      caught instanceof Error
        ? caught.message
        : "Could not open conversation.";
  }
}

async function send() {
  if (!draft.value.trim() || !selected.value) return;

  busy.value = true;
  error.value = "";

  try {
    await api("/messages/send", props.session, {
      conversation: selected.value,
      text: draft.value,
    });

    draft.value = "";
    await loadMessages();
  } catch (caught) {
    error.value =
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
    <h2>Messages</h2>

    <p role="status">{{ error }}</p>

    <button @click="refresh">Check for updates</button>

    <h3>Conversations</h3>

    <p v-if="conversations.length === 0">
      No conversations yet. Contact an owner from a search result.
    </p>

    <ul>
      <li
        v-for="conversation in conversations"
        :key="conversation.conversation"
      >
        <button
          :aria-pressed="
            selected === conversation.conversation
          "
          @click="
            openConversation(conversation.conversation)
          "
        >
          Conversation
          {{ conversation.conversation.slice(0, 8) }}
        </button>
      </li>
    </ul>

    <template v-if="selected">
      <h3>Conversation</h3>

      <p v-if="messages.length === 0">
        No messages yet. Send the first message.
      </p>

      <article
        v-for="message in messages"
        :key="message.id"
        :class="{ mine: message.sender === userId }"
      >
        <strong>
          {{ message.sender === userId ? "You" : "Other participant" }}
        </strong>

        <p class="message-text">{{ message.text }}</p>

        <small>
          {{ new Date(message.sentAt).toLocaleString() }}
        </small>
      </article>

      <form @submit.prevent="send">
        <label for="message">Your message</label>

        <textarea
          id="message"
          v-model="draft"
          maxlength="2000"
          rows="3"
          required
        />

        <button :disabled="busy || !draft.trim()">
          {{ busy ? "Sending…" : "Send" }}
        </button>
      </form>
    </template>
  </section>
</template>

<style scoped>
ul {
  padding-left: 20px;
}

li {
  margin: 8px 0;
}

article {
  border: 1px solid #888;
  border-radius: 8px;
  padding: 12px;
  margin: 12px 0;
}

.mine {
  border-left: 4px solid #368153;
}

.message-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

form {
  display: grid;
  gap: 10px;
  margin-top: 20px;
}

textarea {
  padding: 10px;
  font: inherit;
}
</style>
