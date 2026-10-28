import { onScopeDispose, watch, type Ref } from "vue";

/** Routine feedback expires after requests finish; actionable errors stay visible. */
export function useTransientSuccess(message: Ref<string>, error: Ref<boolean>, busy: Ref<boolean>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = watch([message, error, busy], ([text, failed, pending]) => {
    clearTimeout(timer);
    if (text && !failed && !pending) {
      timer = setTimeout(() => { message.value = ""; }, 6000);
    }
  }, { flush: "sync" });
  onScopeDispose(() => { clearTimeout(timer); stop(); });
}
