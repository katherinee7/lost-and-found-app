<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { client } from "../client";

const props = defineProps<{ session: string }>();

interface Attributes {
  category: string;
  colors: string[];
  brand: string;
  start: string;
  end: string;
  locations: string[];
}

interface Report {
  report: string;
  title: string;
  attributes: Attributes;
  open: boolean;
}

const categories = [
  "Electronics",
  "Keys and cards",
  "Clothing and accessories",
  "Bags",
  "Books and stationery",
  "Bottles and containers",
  "Other",
];

const fields = reactive({
  title: "",
  category: "Electronics",
  colors: "",
  brand: "",
  start: "",
  end: "",
  locations: "",
});

const reports = ref<Report[]>([]);
const busy = ref(false);
const message = ref("");

function splitValues(value: string) {
  return [
    ...new Set(
      value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ];
}

async function load() {
  const result = await client.reports.list({
    session: props.session,
  });

  if ("error" in result) {
    throw new Error(`Could not load reports: ${result.error}`);
  }

  reports.value = result.book.reports;
}

async function submit() {
  message.value = "";

  const start = new Date(fields.start);
  const end = new Date(fields.end);

  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    start > end
  ) {
    message.value = "Enter a valid time interval with start before end.";
    return;
  }

  busy.value = true;

  try {
    const result = await client.reports.create({
    session: props.session,
    title: fields.title,
    attributes: {
        category: fields.category,
        colors: splitValues(fields.colors),
        brand: fields.brand,
        start: start.toISOString(),
        end: end.toISOString(),
        locations: splitValues(fields.locations),
    },
    });

    if ("error" in result) {
    throw new Error(
        result.error === "INVALID_REQUEST"
        ? "Check the report fields and time interval."
        : `Could not create report: ${result.error}`,
    );
    }

    // Reset the form after the report has been saved.
    fields.title = "";
    fields.category = "Electronics";
    fields.colors = "";
    fields.brand = "";
    fields.start = "";
    fields.end = "";
    fields.locations = "";

    await load();
    message.value = "Report created.";
  } catch (error) {
    message.value =
      error instanceof Error ? error.message : "Could not create report.";
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

    <h3>Report a missing item</h3>

    <form @submit.prevent="submit">
      <label>
        Title
        <input
          v-model="fields.title"
          maxlength="120"
          placeholder="Missing calculator"
          required
        />
      </label>

      <label>
        Category
        <select v-model="fields.category">
          <option v-for="category in categories" :key="category">
            {{ category }}
          </option>
        </select>
      </label>

      <label>
        Colors, separated by commas
        <input v-model="fields.colors" placeholder="Black, silver" />
      </label>

      <label>
        Brand (optional)
        <input v-model="fields.brand" maxlength="100" />
      </label>

      <label>
        Earliest possible loss time
        <input v-model="fields.start" type="datetime-local" required />
      </label>

      <label>
        Latest possible loss time
        <input v-model="fields.end" type="datetime-local" required />
      </label>

      <label>
        Possible locations, separated by commas
        <input
          v-model="fields.locations"
          placeholder="Library, Lecture hall"
        />
      </label>

      <button :disabled="busy">
        {{ busy ? "Please wait…" : "Submit report" }}
      </button>
    </form>

    <p role="status">{{ message }}</p>

    <h3>Your reports</h3>

    <p v-if="busy">Loading or saving…</p>
    <p v-else-if="reports.length === 0">You have no reports yet.</p>

    <article v-for="report in reports" :key="report.report">
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

      <button
        v-if="report.open"
        :disabled="busy"
        @click="closeReport(report.report)"
      >
        Mark as returned / close report
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
