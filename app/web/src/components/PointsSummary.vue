<script setup lang="ts">
import { ref, watch } from "vue";
import { client } from "../client";
const props = defineProps<{ session: string; refreshKey: number }>();
const points = ref<number | null>(null);
const failed = ref(false);
let version = 0;
async function load() {
  const current = ++version;
  try {
    const result = await client.returns.balance({ session: props.session });
    if (current !== version) return;
    if ("error" in result) throw new Error("Unavailable");
    points.value = result.points;
    failed.value = false;
  } catch {
    if (current === version) failed.value = true;
  }
}
watch(() => [props.session, props.refreshKey], load, { immediate: true });
</script>

<template>
  <div class="points-summary">
    <strong v-if="!failed">Your points: {{ points ?? "…" }}</strong>
    <button v-else class="quiet" @click="load">Points unavailable · Retry</button>
    <span class="hint">Earn 1 point per jointly confirmed return.</span>
  </div>
</template>

<style scoped>
.points-summary { display: grid; max-width: 250px; line-height: 1.4; font-size: .9rem; }
.points-summary .hint { font-size: .75rem; }
</style>
