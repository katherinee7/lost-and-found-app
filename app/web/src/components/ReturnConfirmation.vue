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
const feedback = ref("");
let disposed = false;
let version = 0;
const ownConfirmed = computed(() => status.value?.role === "recipient"
  ? status.value?.recipientConfirmed : status.value?.contributorConfirmed);

function apply(next: Status) {
  const changed = !status.value?.rewarded && next.rewarded;
  status.value = next;
  if (next.rewarded) feedback.value = "";
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

async function act(action: "begin" | "confirm") {
  if (busy.value) return;
  busy.value = true;
  ++version; // Ignore a status response that started before this action.
  error.value = "";
  feedback.value = "";
  try {
    const input = { session: props.session, conversation: props.conversation };
    const result = action === "begin" ? await client.returns.begin(input) : await client.returns.confirm(input);
    if (disposed) return;
    if ("error" in result) {
      throw new Error(result.error === "CONFLICT"
        ? "This report already has a confirmation with another finder. Refresh its status."
        : "Could not complete this request. Refresh the status, then retry if needed; confirmations and points are saved safely.");
    }
    apply(result.status);
    feedback.value = result.status.rewarded
      ? ""
      : action === "begin" ? "Return confirmation started. Each participant must confirm separately." : "Your confirmation is saved. Waiting for the other participant.";
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
  <section class="return-panel" aria-labelledby="return-title" :aria-busy="busy || loading">
    <div class="section-heading"><h4 id="return-title">Return confirmation</h4><button class="quiet" :disabled="busy || loading" @click="refresh">Refresh status</button></div>
    <p v-if="loading" class="hint" role="status">Loading return status…</p>
    <p v-else-if="unavailable" class="hint">{{ unavailable }}</p>
    <template v-else-if="status">
      <p v-if="status.rewarded" class="status" role="status">Return jointly confirmed. Finder awarded 1 point. Missing report closed.</p>
      <template v-else-if="!status.registered">
        <p class="hint">After the item is returned, the owner can start confirmation with this conversation’s finder. Both must confirm to award 1 point.</p>
        <button v-if="status.role === 'recipient'" :disabled="busy" @click="act('begin')">{{ busy ? "Starting…" : "Start return confirmation" }}</button>
        <p v-else class="hint">Waiting for the owner to start return confirmation.</p>
      </template>
      <template v-else>
        <ul class="confirmation-list"><li>Owner: {{ status.recipientConfirmed ? "Confirmed" : "Not yet confirmed" }}</li><li>Finder: {{ status.contributorConfirmed ? "Confirmed" : "Not yet confirmed" }}</li></ul>
        <p class="hint">Confirmation remains available if the report is manually closed. The finder closes any saved found record separately.</p>
        <button :disabled="busy || ownConfirmed" @click="act('confirm')">{{ busy ? "Saving…" : ownConfirmed ? "You have confirmed" : "Confirm item returned" }}</button>
      </template>
    </template>
    <p v-if="feedback" class="status" role="status">{{ feedback }}</p>
    <p v-if="error" class="status error" role="alert">{{ error }}</p>
  </section>
</template>

<style scoped>
.return-panel { margin-top: 24px; padding: 18px; border: 1px solid var(--line); border-radius: 10px; background: #fafbf7; }
.return-panel .section-heading { margin-bottom: 8px; }
.return-panel > button { margin-top: 12px; }
.confirmation-list { margin: 12px 0; padding-left: 20px; }
</style>
