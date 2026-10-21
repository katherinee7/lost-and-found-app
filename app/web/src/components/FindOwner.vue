<script setup lang="ts">
import { reactive, ref } from "vue";
import { api } from "../api";

const props = defineProps<{ session: string }>();

interface Match {
  report: string;
  title: string;
  category: string;
  start: string;
  end: string;
  locations: string[];
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

function split(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function formatTime(value: string) {
  return new Date(value).toLocaleString();
}

async function search() {
  message.value = "";
  matches.value = [];
  searched.value = false;

  const start = new Date(fields.start);
  const end = new Date(fields.end);

  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    start > end
  ) {
    message.value = "Enter a valid possible loss-time interval.";
    return;
  }

  busy.value = true;

  try {
    const response = await fetch("/api/reports/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: props.session,
        attributes: {
          category: fields.category,
          colors: split(fields.colors),
          brand: fields.brand,
          start: start.toISOString(),
          end: end.toISOString(),
          locations: split(fields.locations),
        },
      }),
    });

    const text = await response.text();

    if (!text) {
      throw new Error("The backend returned an empty response.");
    }

    const result = JSON.parse(text);

    if (!response.ok || result.error) {
      if (result.error === "UNAUTHORIZED") {
        throw new Error("Please log out and log in again.");
      }

      if (result.error === "INVALID_REQUEST") {
        throw new Error("Check the search fields and time interval.");
      }

      throw new Error("Search failed. Please try again.");
    }

    matches.value = result.results.matches;
    searched.value = true;
  } catch (error) {
    message.value =
      error instanceof Error ? error.message : "Search failed.";
  } finally {
    busy.value = false;
  }
}

const emit = defineEmits<{
  contact: [conversation: string];
}>();

async function contactOwner(report: string) {
  busy.value = true;
  message.value = "";

  try {
    const result = await api(
      "/messages/start",
      props.session,
      { report },
    );

    emit("contact", result.conversation);
  } catch (error) {
    message.value =
      error instanceof Error
        ? error.message
        : "Could not start conversation.";
  } finally {
    busy.value = false;
  }
}

</script>

<template>
  <section>
    <h2>Find an Owner</h2>
    <p>Describe the item you found to search missing-item reports.</p>

    <form @submit.prevent="search">
      <label>
        Category
        <select v-model="fields.category">
          <option v-for="category in categories" :key="category">
            {{ category }}
          </option>
        </select>
      </label>

      <label>
        Colors, separated by commas (optional)
        <input v-model="fields.colors" placeholder="Black, silver" />
      </label>

      <label>
        Brand (optional)
        <input v-model="fields.brand" maxlength="100" />
      </label>

      <p>
        When might the owner have lost it? Use a broad interval if
        you are unsure.
      </p>

      <label>
        Earliest possible loss time
        <input v-model="fields.start" type="datetime-local" required />
      </label>

      <label>
        Latest possible loss time
        <input v-model="fields.end" type="datetime-local" required />
      </label>

      <label>
        Locations, separated by commas (optional)
        <input
          v-model="fields.locations"
          placeholder="Library, Lecture hall"
        />
      </label>

      <button :disabled="busy">
        {{ busy ? "Searching…" : "Search" }}
      </button>
    </form>

    <p role="status">{{ message }}</p>

    <template v-if="searched">
      <h3>Potential owners</h3>

      <p v-if="matches.length === 0">
        No compatible missing reports found.
      </p>

      <article v-for="match in matches" :key="match.report">
        <h4>{{ match.title }}</h4>
        <p>{{ match.category }}</p>
        <p>
          {{ formatTime(match.start) }}
          –
          {{ formatTime(match.end) }}
        </p>
        <p>
          {{ match.locations.join(", ") || "Location unspecified" }}
        </p>
        <button
          :disabled="busy"
          @click="contactOwner(match.report)"
        >
          Contact owner
        </button>
      </article>
    </template>
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
