<script setup lang="ts">
import { useId } from "vue";
import type { ReportFields } from "../report-form";
withDefaults(defineProps<{ fields: ReportFields; showTitle?: boolean }>(), { showTitle: true });
const hintId = useId();
const categories = [
  "Electronics", "Keys and cards", "Clothing and accessories", "Bags",
  "Books and stationery", "Bottles and containers", "Other",
];
</script>

<template>
  <div class="fields">
    <p class="hint wide">{{ showTitle ? "Title, category, and time interval are required." : "Category and time interval are required." }}</p>
    <label v-if="showTitle" class="wide">Item title
      <input v-model="fields.title" maxlength="120" placeholder="e.g. Black Casio calculator" required />
    </label>
    <label class="wide">Category
      <select v-model="fields.category" required><option v-for="category in categories" :key="category">{{ category }}</option></select>
    </label>
    <label>Colors <small>(optional, comma separated)</small>
      <input v-model="fields.colors" placeholder="Black, silver" />
    </label>
    <label>Brand <small>(optional)</small>
      <input v-model="fields.brand" maxlength="100" placeholder="e.g. Casio" />
    </label>
    <p :id="hintId" class="hint wide">Possible loss interval · Your local timezone.</p>
    <label>Earliest possible loss
      <input v-model="fields.start" type="datetime-local" step="any" :aria-describedby="hintId" required />
    </label>
    <label>Latest possible loss
      <input v-model="fields.end" type="datetime-local" step="any" :aria-describedby="hintId" required />
    </label>
    <label class="wide">Possible locations <small>(optional, comma separated)</small>
      <input v-model="fields.locations" placeholder="Library, Lecture hall" />
    </label>
  </div>
</template>

<style scoped>
.fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.wide { grid-column: 1 / -1; }
@media (max-width: 1100px) { .fields { grid-template-columns: minmax(0, 1fr); } }
</style>
