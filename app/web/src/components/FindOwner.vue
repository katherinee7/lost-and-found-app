<script setup lang="ts">
import { reactive, ref } from "vue";
import { client } from "../client";
import ReportFields from "./ReportFields.vue";

const props = defineProps<{ session: string }>();

interface Match {
  report: string;
  title: string;
  category: string;
  start: string;
  end: string;
  locations: string[];
}

const fields = reactive({
  title: "",
  category: "Electronics",
  colors: "",
  brand: "",
  start: "",
  end: "",
  locations: "",
});

const matches = ref<Match[]>([]);
const busy = ref(false);
const searched = ref(false);
const message = ref("");
const saving = ref(false);
const messageError = ref(false);
const searching = ref(false);

function split(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function formatTime(value: string) {
  return new Date(value).toLocaleString();
}

function currentAttributes() {
  const start = new Date(fields.start);
  const end = new Date(fields.end);
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    start > end
  ) {
    throw new Error("Enter a valid possible loss-time interval.");
  }
  return {
    category: fields.category,
    colors: split(fields.colors),
    brand: fields.brand,
    start: start.toISOString(),
    end: end.toISOString(),
    locations: split(fields.locations),
  };
}

async function search() {
  message.value = "";
  messageError.value = false;
  matches.value = [];
  searched.value = false;
  searching.value = true;
  busy.value = true;

  try {
    const result = await client.reports.search({
      session: props.session,
      attributes: currentAttributes(),
    });

    if ("error" in result) {
      throw new Error(
        result.error === "UNAUTHORIZED"
          ? "Please log out and log in again."
          : result.error === "INVALID_REQUEST"
            ? "Check the search fields and time interval."
            : `Search failed: ${result.error}`,
      );
    }

    matches.value = result.results.matches;
    searched.value = true;
  } catch (error) {
    messageError.value = true;
    message.value =
      error instanceof Error ? error.message : "Search failed.";
  } finally {
    busy.value = false;
    searching.value = false;
  }
}

async function saveForLater() {
  busy.value = true;
  saving.value = true;
  message.value = "";
  messageError.value = false;
  try {
    const result = await client.reports.create({
      session: props.session,
      kind: "found",
      title: `Found ${fields.category.toLowerCase()}`,
      attributes: currentAttributes(),
    });
    if ("error" in result) {
      throw new Error(
        result.error === "INVALID_REQUEST"
          ? "Check the item fields and time interval."
          : `Could not save found record: ${result.error}`,
      );
    }
    message.value = "Saved privately. Review or close it in My Reports → Saved found records.";
  } catch (error) {
    messageError.value = true;
    message.value = error instanceof Error ? error.message : "Could not save found record.";
  } finally {
    busy.value = false;
    searching.value = false;
    saving.value = false;
  }
}

const emit = defineEmits<{
  contact: [conversation: string];
}>();

async function contactOwner(report: string) {
  busy.value = true;
  message.value = "";
  messageError.value = false;

  try {
    const result = await client.messages.start({
      session: props.session,
      report,
    });

    if ("error" in result) {
      throw new Error(
        result.error === "NOT_FOUND"
          ? "That report is unavailable or belongs to you."
          : `Could not start conversation: ${result.error}`,
      );
    }

    emit("contact", result.conversation);
  } catch (error) {
    messageError.value = true;
    message.value =
      error instanceof Error
        ? error.message
        : "Could not start conversation.";
  } finally {
    busy.value = false;
    searching.value = false;
  }
}

</script>

<template>
  <section>
    <header class="page-heading">
      <p class="eyebrow">Found something?</p>
      <h2 tabindex="-1">Find an Owner</h2>
      <p>Describe what you found. We’ll look for compatible missing reports without revealing their private details.</p>
    </header>
    <div class="workspace">
      <section class="panel" aria-labelledby="finder-form-title">
        <h3 id="finder-form-title">Describe the item</h3>
        <p class="hint">Search now, or save the details to check for matches later.</p>
        <form @submit.prevent="search" :aria-busy="busy">
          <fieldset :disabled="busy"><legend class="sr-only">Found item characteristics</legend><ReportFields :fields="fields" :show-title="false" /></fieldset>
          <div class="actions">
            <button class="primary" :disabled="busy">{{ searching ? "Searching…" : "Search for owner" }}</button>
            <button type="button" :disabled="busy" @click="saveForLater">{{ saving ? "Saving…" : "Save for later" }}</button>
          </div>
          <p class="hint">Saved records are private. Find them in My Reports → Saved found records.</p>
        </form>
        <p v-if="message" class="status" :class="{ error: messageError }" :role="messageError ? 'alert' : 'status'">{{ message }}</p>
      </section>
      <section aria-labelledby="results-heading" :aria-busy="searching">
        <div class="section-heading"><h3 id="results-heading">Potential owners</h3><span v-if="searched" class="badge">{{ matches.length }} results</span></div>
        <p v-if="searching" class="loading" role="status">Looking for compatible missing reports…</p>
        <div v-else-if="!searched" class="empty-state"><strong>Your search starts here.</strong>Enter the item’s characteristics and search to see potential owners.</div>
        <div v-else-if="matches.length === 0" class="empty-state"><strong>No matches right now.</strong>Save this item for later, then check your saved records when new reports arrive.</div>
        <div v-else class="result-list">
          <article v-for="match in matches" :key="match.report" class="record-card">
            <div class="record-header"><h4>{{ match.title }}</h4><span class="badge">Missing</span></div>
            <dl class="record-details">
              <div><dt>Category</dt><dd>{{ match.category }}</dd></div>
              <div><dt>Possible locations</dt><dd>{{ match.locations.join(", ") || "Unspecified" }}</dd></div>
              <div class="wide"><dt>Possible loss interval</dt><dd>{{ formatTime(match.start) }} – {{ formatTime(match.end) }}</dd></div>
            </dl>
            <div class="actions"><button class="primary" :disabled="busy" :aria-label="`Contact owner about ${match.title}`" @click="contactOwner(match.report)">Contact owner</button></div>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
