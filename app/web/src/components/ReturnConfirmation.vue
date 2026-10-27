<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { client } from "../client";

const props = defineProps<{ session: string; conversation: string }>();
const emit = defineEmits<{ updated: [] }>();
interface Status {
  registered: boolean;
  contributorConfirmed: boolean;
  recipientConfirmed: boolean;
  rewarded: boolean;
  role: "contributor" | "recipient";
}
const status = ref<Status | null>(null);
const loading = ref(true);
const busy = ref(false);
const error = ref("");
const unavailable = ref("");
const summary = computed(() => {
  if (loading.value) return "Loading…";
  if (error.value) return "Status unavailable";
  if (unavailable.value) return "Unavailable here";
  if (status.value?.rewarded) return "Return complete";
  if (!status.value?.registered) return "Ready after the handoff";
  if (ownConfirmed.value) return status.value?.role === "recipient" ? "Waiting for finder" : "Waiting for owner";
  return "Your confirmation needed";
});
let disposed = false;
let version = 0;
const ownConfirmed = computed(() => status.value?.role === "recipient"
  ? status.value?.recipientConfirmed : status.value?.contributorConfirmed);

function apply(next: Status) {
  const changed = !status.value?.rewarded && next.rewarded;
  status.value = next;

  if (changed) emit("updated");
}

async function refresh() {
  if (busy.value || disposed) return;
  const current = ++version;
  try {
    const result = await client.returns.status({ session: props.session, conversation: props.conversation });
    if (disposed || current !== version) return;
    if ("error" in result) {
      if (result.error === "NOT_FOUND" || result.error === "CONFLICT") {
        status.value = null;
        unavailable.value = result.error === "CONFLICT"
          ? "Return confirmation for this report is registered with another finder. It cannot be replaced here."
          : "Return confirmation is available only in report-linked conversations. Earlier conversations can still be used for messages.";
        error.value = "";
        return;
      }
      throw new Error("Could not load return status. Refresh to try again.");
    }
    unavailable.value = "";
    error.value = "";
    apply(result.status);
  } catch (caught) {
    if (!disposed && current === version) error.value = caught instanceof Error ? caught.message : "Could not load return status.";
  } finally {
    if (!disposed && current === version) loading.value = false;
  }
}

async function confirmReturn() {
  if (busy.value) return;
  busy.value = true;
  ++version; // Ignore a status response that started before this action.
  error.value = "";

  try {
    const input = { session: props.session, conversation: props.conversation };
    const result = await client.returns.confirm(input);
    if (disposed) return;
    if ("error" in result) {
      throw new Error(result.error === "CONFLICT"
        ? "This report already has a confirmation with another finder. Refresh its status."
        : "Could not complete this request. Refresh the status, then retry if needed; confirmations and points are saved safely.");
    }
    apply(result.status);
  } catch (caught) {
    if (!disposed) error.value = caught instanceof Error ? caught.message : "Could not save confirmation.";
  } finally {
    if (!disposed) { busy.value = false; loading.value = false; }
  }
}

onMounted(refresh);
onUnmounted(() => { disposed = true; ++version; });
defineExpose({ refresh });
</script>

<template>
  <details class="return-panel" :aria-busy="busy || loading">
    <summary><span>Confirm return</span><span class="hint" role="status">{{ summary }}</span></summary>
    <div class="return-content">
      <p v-if="loading" class="hint">Loading return status…</p>
      <p v-else-if="unavailable" class="hint">{{ unavailable }}</p>
      <template v-else-if="status">
        <p v-if="status.rewarded" class="status">Return confirmed. Finder earned 1 point; associated reports closed.</p>
        <template v-else>
          <p>After the handoff, each person confirms once. Either person can go first.</p>
          <p class="hint">Both confirmations award the finder 1 point and close the missing report and its linked saved found item, if any.</p>
          <ul v-if="status.registered" class="confirmation-list">
            <li>Owner{{ status.role === 'recipient' ? ' (you)' : '' }}: {{ status.recipientConfirmed ? "Confirmed" : "Pending" }}</li>
            <li>Finder{{ status.role === 'contributor' ? ' (you)' : '' }}: {{ status.contributorConfirmed ? "Confirmed" : "Pending" }}</li>
          </ul>
          <p v-if="ownConfirmed" class="hint">Your confirmation is saved. {{ status.role === 'recipient' ? 'The finder' : 'The owner' }} still needs to confirm.</p>
          <button v-else class="primary" :disabled="busy" @click="confirmReturn">{{ busy ? "Saving…" : status.role === 'recipient' ? "I received my item" : "I returned the item" }}</button>
          <p class="hint">Manual closing awards no points. You can still confirm after closing.</p>
        </template>
      </template>
      <p v-if="error" class="status error" role="alert">{{ error }}</p>
      <button class="quiet" :disabled="busy || loading" @click="refresh">Refresh status</button>
    </div>
  </details>
</template>

<style scoped>
.return-panel { margin-top: 20px; border: 1px solid var(--line); border-radius: 10px; background: #fafbf7; }
.return-panel summary { padding: 14px 16px; cursor: pointer; font-weight: 600; }
.return-panel summary .hint { display: inline-block; margin-left: 12px; font-weight: 400; }
.return-content { padding: 0 16px 16px; }
.confirmation-list { margin: 12px 0; padding-left: 20px; }
</style>
