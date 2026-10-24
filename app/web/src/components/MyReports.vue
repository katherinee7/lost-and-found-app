<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from "vue";
import { client } from "../client";
import ReportFields from "./ReportFields.vue";
import { attributesFromFields, emptyReportFields, prefillReport, type ReportAttributes as Attributes } from "../report-form";

const props = defineProps<{ session: string }>();

interface Report {
  report: string;
  title: string;
  kind: "missing" | "found";
  attributes: Attributes;
  open: boolean;
}

interface Match {
  report: string;
  title: string;
  category: string;
  start: string;
  end: string;
  locations: string[];
}

const emit = defineEmits<{ contact: [conversation: string] }>();
const matchesByReport = ref<Record<string, Match[]>>({});
const matchErrors = ref<Record<string, string>>({});
const expanded = ref<Record<string, boolean>>({});

const fields = reactive(emptyReportFields());
const editFields = reactive(emptyReportFields());
const editing = ref<Report | null>(null);
const editError = ref("");
const editPanel = ref<HTMLElement | null>(null);

const reports = ref<Report[]>([]);
const selectedKind = ref<"missing" | "found">("missing");
const visibleReports = computed(() =>
  reports.value.filter((report) => report.kind === selectedKind.value),
);
const busy = ref(false);
const message = ref("");

async function load() {
  const result = await client.reports.list({
    session: props.session,
  });

  if ("error" in result) {
    throw new Error(`Could not load reports: ${result.error}`);
  }

  reports.value = result.book.reports;
  matchesByReport.value = {};
  matchErrors.value = {};
  const openFound = reports.value.filter((report) => report.kind === "found" && report.open);
  const results = await Promise.allSettled(openFound.map(async ({ report }) => {
    const result = await client.reports.matches({ session: props.session, report });
    if ("error" in result) throw new Error(`Could not load matches: ${result.error}`);
    return result.results.matches;
  }));
  results.forEach((result, index) => {
    const report = openFound[index]!.report;
    if (result.status === "fulfilled") {
      matchesByReport.value[report] = result.value;
    } else {
      matchErrors.value[report] = result.reason instanceof Error
        ? result.reason.message : "Could not load matches. Refresh to try again.";
    }
  });
}

async function submit() {
  message.value = "";

  busy.value = true;

  try {
    const result = await client.reports.create({
      session: props.session,
      title: fields.title,
      kind: "missing",
      attributes: attributesFromFields(fields),
    });

    if ("error" in result) {
    throw new Error(
        result.error === "INVALID_REQUEST"
        ? "Check the report fields and time interval."
        : `Could not create report: ${result.error}`,
    );
    }

    Object.assign(fields, emptyReportFields());

    await load();
    message.value = "Report created.";
  } catch (error) {
    message.value =
      error instanceof Error ? error.message : "Could not create report.";
  } finally {
    busy.value = false;
  }
}

async function startEditing(report: Report) {
  if (!report.open || busy.value) return;
  editing.value = report;
  editError.value = "";
  Object.assign(editFields, prefillReport(report.title, report.attributes));
  await nextTick();
  editPanel.value?.querySelector("input")?.focus();
}

function cancelEditing() {
  editing.value = null;
  editError.value = "";
}

async function saveEdit() {
  const report = editing.value;
  if (!report || busy.value) return;
  busy.value = true;
  editError.value = "";
  message.value = "";
  try {
    const result = await client.reports.update({
      session: props.session,
      report: report.report,
      title: editFields.title,
      attributes: attributesFromFields(editFields, report.attributes),
    });
    if ("error" in result) {
      throw new Error(result.error === "NOT_FOUND"
        ? "This report is unavailable or has been closed. Cancel and refresh the list."
        : result.error === "INVALID_REQUEST"
          ? "Check the report fields and time interval."
          : `Could not save changes: ${result.error}`);
    }
    cancelEditing();
    message.value = "Changes saved.";
  } catch (error) {
    editError.value = error instanceof Error ? error.message : "Could not save changes.";
    busy.value = false;
    return;
  }
  // A refresh failure must not suggest that an already successful edit failed.
  try {
    await load();
  } catch {
    matchesByReport.value = {};
    message.value = "Changes saved, but the list could not refresh. Refresh to see the latest results.";
  } finally {
    busy.value = false;
  }
}

async function closeReport(report: string) {
  busy.value = true;
  message.value = "";

  try {
    const result = await client.reports.close({
      session: props.session,
      report,
    });

    if ("error" in result) {
      throw new Error(`Could not close report: ${result.error}`);
    }
    await load();
    message.value = "Report closed.";
  } catch (error) {
    message.value =
      error instanceof Error ? error.message : "Could not close report.";
  } finally {
    busy.value = false;
  }
}

async function refresh() {
  busy.value = true;
  message.value = "";
  try {
    await load();
  } catch (error) {
    matchesByReport.value = {};
    message.value = error instanceof Error ? error.message : "Could not refresh reports.";
  } finally {
    busy.value = false;
  }
}

async function contactOwner(report: string) {
  busy.value = true;
  message.value = "";
  try {
    const result = await client.messages.start({ session: props.session, report });
    if ("error" in result) {
      throw new Error(result.error === "NOT_FOUND"
        ? "That report is no longer available. Refresh to update matches."
        : `Could not start conversation: ${result.error}`);
    }
    emit("contact", result.conversation);
  } catch (error) {
    message.value = error instanceof Error ? error.message : "Could not start conversation.";
  } finally {
    busy.value = false;
  }
}

function formatTime(value: string) {
  return new Date(value).toLocaleString();
}

onMounted(async () => {
  busy.value = true;

  try {
    await load();
  } catch (error) {
    message.value =
      error instanceof Error ? error.message : "Could not load reports.";
  } finally {
    busy.value = false;
  }
});
</script>

<template>
  <section>
    <h2>My Reports</h2>
    <p>Your full reports are private.</p>

    <h3 v-if="!editing">Report a missing item</h3>

    <form v-if="!editing" @submit.prevent="submit">
      <ReportFields :fields="fields" />

      <button :disabled="busy">
        {{ busy ? "Please wait…" : "Submit report" }}
      </button>
    </form>

    <p role="status">{{ message }}</p>

    <section v-if="editing" ref="editPanel" aria-label="Edit report">
      <h3>Edit {{ editing.kind === "found" ? "found record" : "missing report" }}</h3>
      <form @submit.prevent="saveEdit">
        <fieldset :disabled="busy">
          <legend>Report details</legend>
          <ReportFields :fields="editFields" />
        </fieldset>
        <p role="status">{{ editError }}</p>
        <button :disabled="busy">{{ busy ? "Saving…" : "Save changes" }}</button>
        <button type="button" :disabled="busy" @click="cancelEditing">Cancel</button>
      </form>
    </section>

    <h3>Your records</h3>
    <button :disabled="busy || !!editing" @click="refresh">Refresh records and matches</button>
    <div role="group" aria-label="Record kind">
      <button
        :aria-pressed="selectedKind === 'missing'"
        @click="selectedKind = 'missing'"
      >
        Missing reports
      </button>
      <button
        :aria-pressed="selectedKind === 'found'"
        @click="selectedKind = 'found'"
      >
        Saved found records
      </button>
    </div>
    <p v-if="selectedKind === 'found'">
      Save items from Find an Owner using Save for later. These records are private.
    </p>

    <p v-if="busy">Loading or saving…</p>
    <p v-else-if="visibleReports.length === 0">
      {{ selectedKind === "found"
        ? "You have no saved found records yet."
        : "You have no missing reports yet." }}
    </p>

    <article v-for="report in visibleReports" :key="report.report">
      <h4>{{ report.title }}</h4>
      <p>
        {{ report.attributes.category }} ·
        {{ report.open ? "Open" : "Closed" }}
      </p>
      <p>Colors: {{ report.attributes.colors.join(", ") || "Unspecified" }}</p>
      <p>Brand: {{ report.attributes.brand || "Unspecified" }}</p>
      <p>
        {{ formatTime(report.attributes.start) }}
        –
        {{ formatTime(report.attributes.end) }}
      </p>
      <p>
        Locations:
        {{ report.attributes.locations.join(", ") || "Unspecified" }}
      </p>

      <section v-if="report.kind === 'found' && report.open" aria-label="Potential matches">
        <p v-if="busy">Updating matches…</p>
        <p v-else-if="matchErrors[report.report]" role="status">
          {{ matchErrors[report.report] }}
        </p>
        <template v-else-if="matchesByReport[report.report]">
          <p>{{ matchesByReport[report.report]!.length }} current potential matches</p>
          <button
            :aria-expanded="!!expanded[report.report]"
            @click="expanded[report.report] = !expanded[report.report]"
          >
            {{ expanded[report.report] ? "Hide matches" : "View matches" }}
          </button>
          <div v-if="expanded[report.report]">
            <p v-if="matchesByReport[report.report]!.length === 0">
              No current matches. Refresh later to check again.
            </p>
            <article v-for="match in matchesByReport[report.report]" :key="match.report">
              <h5>{{ match.title }}</h5>
              <p>{{ match.category }}</p>
              <p>{{ formatTime(match.start) }} – {{ formatTime(match.end) }}</p>
              <p>{{ match.locations.join(", ") || "Location unspecified" }}</p>
              <button :disabled="busy || !!editing" @click="contactOwner(match.report)">Contact owner</button>
            </article>
          </div>
        </template>
        <p v-else>Matches unavailable. Refresh to try again.</p>
      </section>

      <button
        v-if="report.open"
        :disabled="busy || !!editing"
        @click="startEditing(report)"
      >
        Edit
      </button>
      <p v-else>Closed records are read-only.</p>

      <button
        v-if="report.open"
        :disabled="busy || !!editing"
        @click="closeReport(report.report)"
      >
        {{ report.kind === "found" ? "Close found record" : "Mark as returned / close report" }}
      </button>
    </article>
  </section>
</template>

<style scoped>
form,
label {
  display: grid;
  gap: 8px;
}

form {
  gap: 16px;
}

input,
select {
  padding: 10px;
  font: inherit;
  min-width: 0;
}

article {
  border: 1px solid #888;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
}
</style>
