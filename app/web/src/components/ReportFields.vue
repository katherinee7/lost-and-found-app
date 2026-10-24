<script setup lang="ts">
import type { ReportFields } from "../report-form";
defineProps<{ fields: ReportFields }>();
const categories = [
  "Electronics", "Keys and cards", "Clothing and accessories", "Bags",
  "Books and stationery", "Bottles and containers", "Other",
];
</script>

<template>
  <div class="fields">
      <label>
        Title
        <input
          v-model="fields.title"
          maxlength="120"
          placeholder="Calculator"
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
        <input v-model="fields.start" type="datetime-local" step="any" required />
      </label>

      <label>
        Latest possible loss time
        <input v-model="fields.end" type="datetime-local" step="any" required />
      </label>

      <label>
        Possible locations, separated by commas
        <input
          v-model="fields.locations"
          placeholder="Library, Lecture hall"
        />
      </label>

  </div>
</template>

<style scoped>
.fields, label { display: grid; gap: 8px; }
.fields { gap: 16px; }
input, select { padding: 10px; font: inherit; min-width: 0; }
</style>
