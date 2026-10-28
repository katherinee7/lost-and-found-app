<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from "vue";
import { client } from "../client";
import { useTransientSuccess } from "../composables/useTransientSuccess";
import ReportFields from "./ReportFields.vue";
import { attributesFromFields, emptyReportFields, prefillReport, type ReportAttributes as Attributes } from "../report-form";

const props = withDefaults(defineProps<{ session: string; kind?: "missing" | "found" }>(), { kind: "missing" });

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
const showClosed = ref(false);
const ownReports = computed(() => reports.value.filter((report) => report.kind === props.kind));
const visibleReports = computed(() =>
  ownReports.value.filter((report) => report.open || showClosed.value),
);
const busy = ref(false);
const message = ref("");
const messageError = ref(false);
useTransientSuccess(message, messageError, busy);
const hasLoaded = ref(false);

async function load() {
  const result = await client.reports.list({
    session: props.session,
  });

  if ("error" in result) {
    throw new Error(`Could not load reports: ${result.error}`);
  }

  reports.value = result.book.reports;
  hasLoaded.value = true;
  matchesByReport.value = {};
  matchErrors.value = {};
  const openFound = reports.value.filter((report) => props.kind === "found" && report.kind === "found" && report.open);
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
  messageError.value = false;

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

    try {
      await load();
      message.value = "Report created.";
    } catch {
      messageError.value = true;
      message.value = "Report created, but the list could not refresh. Refresh reports to see it.";
    }
  } catch (error) {
    messageError.value = true;
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
  message.value = "";
  messageError.value = false;
  Object.assign(editFields, prefillReport(report.title, report.attributes));
  await nextTick();
  editPanel.value?.querySelector("input")?.focus();
}

async function cancelEditing() {
  const report = editing.value?.report;
  editing.value = null;
  editError.value = "";
  await nextTick();
  if (report) document.getElementById(`edit-${report}`)?.focus();
}

async function saveEdit() {
  const report = editing.value;
  if (!report || busy.value) return;
  busy.value = true;
  editError.value = "";
  message.value = "";
  messageError.value = false;
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
    await cancelEditing();
    message.value = "Changes saved.";
  } catch (error) {
    messageError.value = true;
    editError.value = error instanceof Error ? error.message : "Could not save changes.";
    busy.value = false;
    return;
  }
  // A refresh failure must not suggest that an already successful edit failed.
  try {
    await load();
  } catch {
    matchesByReport.value = {};
    messageError.value = true;
    message.value = "Changes saved, but the list could not refresh. Refresh to see the latest results.";
  } finally {
    busy.value = false;
    await nextTick();
    document.getElementById(`edit-${report.report}`)?.focus();
  }
}

const closeDialog = ref<HTMLDialogElement | null>(null);
const closing = ref<Report | null>(null);

function requestClose(report: Report) {
  if (busy.value || editing.value) return;
  closing.value = report;
  closeDialog.value?.showModal();
}

function cancelClose() {
  closeDialog.value?.close();
  closing.value = null;
}

async function confirmClose() {
  const report = closing.value;
  if (!report) return;
  cancelClose();
  await closeReport(report.report);
}

async function closeReport(report: string) {
  busy.value = true;
  message.value = "";
  messageError.value = false;

  try {
    const result = await client.reports.close({
      session: props.session,
      report,
    });

    if ("error" in result) {
      throw new Error(`Could not close report: ${result.error}`);
    }
    try {
      await load();
      message.value = "Report closed.";
    } catch {
      messageError.value = true;
      message.value = "Report closed, but the list could not refresh. Refresh to see the latest records.";
    }
  } catch (error) {
    messageError.value = true;
    message.value =
      error instanceof Error ? error.message : "Could not close report.";
  } finally {
    busy.value = false;
    await nextTick();
    document.getElementById("records-heading")?.focus();
  }
}

async function refresh() {
  busy.value = true;
  message.value = "";
  messageError.value = false;
  try {
    await load();
  } catch (error) {
    messageError.value = true;
    matchesByReport.value = {};
    message.value = error instanceof Error ? error.message : "Could not refresh reports.";
  } finally {
    busy.value = false;
  }
}

async function contactOwner(report: string, foundReport: string) {
  busy.value = true;
  message.value = "";
  messageError.value = false;
  try {
    const result = await client.messages["start-saved"]({ session: props.session, report, foundReport });
    if ("error" in result) {
      throw new Error(result.error === "NOT_FOUND"
        ? "That report is no longer a compatible match. Refresh to update matches."
        : result.error === "CONFLICT"
          ? "This conversation is linked to a different saved item. Open it in Messages to continue."
          : `Could not start conversation: ${result.error}`);
    }
    emit("contact", result.conversation);
  } catch (error) {
    messageError.value = true;
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
    messageError.value = true;
    message.value =
      error instanceof Error ? error.message : "Could not load reports.";
  } finally {
    busy.value = false;
  }
});
</script>

<template>
  <section>
    <dialog ref="closeDialog" class="close-dialog" aria-labelledby="close-title" aria-describedby="close-description" @cancel.prevent="cancelClose">
      <h3 id="close-title">Close this report?</h3>
      <p v-if="closing" class="hint">{{ closing.title }}</p>
      <p id="close-description">{{ closing?.kind === "found"
        ? "This item will stop checking for matches. Its details and conversations will remain available. You cannot reopen it."
        : "This report will stop appearing in matches. Its details and conversations will remain available. You cannot reopen it." }}</p>
      <p class="hint">This does not confirm a return or award points.</p>
      <div class="actions">
        <button type="button" autofocus @click="cancelClose">Cancel</button>
        <button type="button" class="primary" @click="confirmClose">Close report</button>
      </div>
    </dialog>
    <header v-if="kind === 'missing'" class="page-heading">
      <h2 tabindex="-1">My Missing Reports</h2>
      <a class="mobile-record-jump" href="#records-heading">Jump to your records ↓</a>
    </header>
    <p v-if="message" class="status" :class="{ error: messageError }" :role="messageError ? 'alert' : 'status'">{{ message }}</p>
    <div :class="{ workspace: kind === 'missing' || !!editing }">
      <section v-if="kind === 'missing' || editing" class="panel" :aria-label="editing ? 'Edit report' : 'Create missing report'" ref="editPanel">
        <h3>{{ editing ? (editing.kind === "found" ? "Edit saved found item" : "Edit missing report") : "Report a missing item" }}</h3>
        <p v-if="!editing" class="hint">Full details are private.</p>
        <form v-if="!editing" @submit.prevent="submit" :aria-busy="busy">
          <fieldset :disabled="busy"><legend class="sr-only">Missing item details</legend><ReportFields :fields="fields" /></fieldset>
          <button class="primary" :disabled="busy">{{ busy ? "Please wait…" : "Create report" }}</button>
        </form>
        <form v-else @submit.prevent="saveEdit" :aria-busy="busy">
          <fieldset :disabled="busy"><legend class="sr-only">Edit report details</legend><ReportFields :fields="editFields" /></fieldset>
          <p v-if="editError" class="status error" role="alert">{{ editError }}</p>
          <div class="actions">
            <button class="primary" :disabled="busy">{{ busy ? "Saving…" : "Save changes" }}</button>
            <button type="button" :disabled="busy" @click="cancelEditing">Cancel</button>
          </div>
        </form>
      </section>
      <section aria-labelledby="records-heading">
        <div class="section-heading"><h3 id="records-heading" tabindex="-1">{{ kind === "found" ? "Saved found items" : "Your reports" }}</h3><button :disabled="busy || !!editing" @click="refresh">{{ kind === "found" ? "Refresh matches" : "Refresh reports" }}</button></div>
        <label class="closed-filter"><input v-model="showClosed" type="checkbox" :disabled="busy || !!editing" /> Show closed</label>
        <p v-if="kind === 'found'" class="hint">Private to you. Match counts reflect the latest refresh.</p>
        <p v-if="busy" class="loading" role="status">{{ kind === "found" ? "Updating your saved items and matches…" : "Updating your missing reports…" }}</p>
        <div v-else-if="hasLoaded && !messageError && visibleReports.length === 0" class="empty-state">
          <strong>{{ ownReports.length ? "No open reports." : kind === "found" ? "No saved found items yet." : "No missing reports yet." }}</strong>
        </div>
        <div class="records">
          <article v-for="report in visibleReports" :key="report.report" class="record-card">
            <div class="record-header"><h4>{{ report.title }}</h4><span class="badge" :class="{ closed: !report.open }">{{ report.open ? "Open" : "Closed" }}</span></div>
            <dl class="record-details">
              <div><dt>Category</dt><dd>{{ report.attributes.category }}</dd></div>
              <div><dt>Brand</dt><dd>{{ report.attributes.brand || "Unspecified" }}</dd></div>
              <div><dt>Colors</dt><dd>{{ report.attributes.colors.join(", ") || "Unspecified" }}</dd></div>
              <div><dt>Possible locations</dt><dd>{{ report.attributes.locations.join(", ") || "Unspecified" }}</dd></div>
              <div class="wide"><dt>Possible loss interval</dt><dd>{{ formatTime(report.attributes.start) }} – {{ formatTime(report.attributes.end) }}</dd></div>
            </dl>
            <section v-if="report.kind === 'found' && report.open" class="match-section" aria-label="Potential matches">
              <p v-if="busy" class="hint">Updating matches…</p>
              <p v-else-if="matchErrors[report.report]" class="status error" role="alert">{{ matchErrors[report.report] }}</p>
              <template v-else-if="matchesByReport[report.report]">
                <div class="match-summary"><strong>{{ matchesByReport[report.report]!.length }} potential {{ matchesByReport[report.report]!.length === 1 ? "match" : "matches" }}</strong>
                  <button :aria-expanded="!!expanded[report.report]" :aria-controls="`matches-${report.report}`" @click="expanded[report.report] = !expanded[report.report]">{{ expanded[report.report] ? "Hide matches" : "View matches" }}</button>
                </div>
                <div v-if="expanded[report.report]" :id="`matches-${report.report}`">
                  <p v-if="matchesByReport[report.report]!.length === 0" class="hint">No matches yet.</p>
                  <article v-for="match in matchesByReport[report.report]" :key="match.report" class="match-card">
                    <h5>{{ match.title }}</h5><p>{{ match.category }}</p><p>{{ formatTime(match.start) }} – {{ formatTime(match.end) }}</p><p>{{ match.locations.join(", ") || "Location unspecified" }}</p>
                    <div class="actions"><button :disabled="busy || !!editing" :aria-label="`Contact owner about ${match.title}`" @click="contactOwner(match.report, report.report)">Contact owner</button></div>
                  </article>
                </div>
              </template>
              <p v-else class="hint">Matches unavailable. Refresh to try again.</p>
            </section>
            <div v-if="report.open" class="actions">
              <button :id="`edit-${report.report}`" :disabled="busy || !!editing" :aria-label="`Edit ${report.title}`" @click="startEditing(report)">Edit</button>
              <button class="quiet danger" :disabled="busy || !!editing" :aria-label="`Close report: ${report.title}`" @click="requestClose(report)">Close report</button>
            </div>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
