<script setup lang="ts">
import { nextTick, reactive, ref } from "vue";
import { client } from "../client";
import { useTransientSuccess } from "../composables/useTransientSuccess";
import type { ReportAttributes } from "../report-form";
import ReportFields from "./ReportFields.vue";
import MyReports from "./MyReports.vue";

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

const section = ref<"search" | "saved">("search");
const saved = ref(false);
const sectionContent = ref<HTMLElement | null>(null);

async function showSection(destination: "search" | "saved") {
  section.value = destination;
  await nextTick();
  sectionContent.value?.querySelector<HTMLElement>("h3[tabindex]")?.focus();
}

const matches = ref<Match[]>([]);
const searchAttributes = ref<ReportAttributes | null>(null);
const busy = ref(false);
const searched = ref(false);
const message = ref("");
const saving = ref(false);
const messageError = ref(false);
useTransientSuccess(message, messageError, busy);
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
  searchAttributes.value = null;
  searching.value = true;
  busy.value = true;

  try {
    const attributes = currentAttributes();
    const result = await client.reports.search({
      session: props.session,
      attributes,
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

    searchAttributes.value = attributes;
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
  saved.value = false;
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
    saved.value = true;
    message.value = "Item saved privately.";
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
  if (!searchAttributes.value) return;
  busy.value = true;
  message.value = "";
  messageError.value = false;

  try {
    const result = await client.messages.start({
      session: props.session,
      report,
      attributes: searchAttributes.value,
    });

    if ("error" in result) {
      throw new Error(
        result.error === "NOT_FOUND"
          ? "That report is no longer a compatible match. Search again to update results."
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
      <h2 tabindex="-1">Find an Owner</h2>
    </header>
    <div class="segmented" role="group" aria-label="Find an Owner sections">
      <button :aria-pressed="section === 'search'" @click="showSection('search')">Search for an owner</button>
      <button :aria-pressed="section === 'saved'" @click="showSection('saved')">Saved found items</button>
    </div>
    <div ref="sectionContent">
    <MyReports v-if="section === 'saved'" :session="session" kind="found" @contact="emit('contact', $event)" />
    <div v-show="section === 'search'" class="workspace">
      <section class="panel" aria-labelledby="finder-form-title">
        <h3 id="finder-form-title" tabindex="-1">Search for an owner</h3>
        <form @submit.prevent="search" :aria-busy="busy">
          <fieldset :disabled="busy"><legend class="sr-only">Found item characteristics</legend><ReportFields :fields="fields" :show-title="false" /></fieldset>
          <div class="actions">
            <button class="primary" :disabled="busy">{{ searching ? "Searching…" : "Search" }}</button>
            <button type="button" :disabled="busy" @click="saveForLater">{{ saving ? "Saving…" : "Save for later" }}</button>
          </div>
          <p class="hint">Saved items are private.</p>
        </form>
        <p v-if="message" class="status" :class="{ error: messageError }" :role="messageError ? 'alert' : 'status'">{{ message }}</p>
        <button v-if="saved" type="button" :disabled="busy" @click="showSection('saved')">View saved items</button>
      </section>
      <section aria-labelledby="results-heading" :aria-busy="searching">
        <div class="section-heading"><h3 id="results-heading">Potential owners</h3><span v-if="searched" class="badge">{{ matches.length }} results</span></div>
        <p v-if="searching" class="loading" role="status">Looking for compatible missing reports…</p>
        <div v-else-if="!searched" class="empty-state"><strong>No search yet.</strong></div>
        <div v-else-if="matches.length === 0" class="empty-state"><strong>No matches right now.</strong>Save for later to check again.</div>
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
    </div>
  </section>
</template>
