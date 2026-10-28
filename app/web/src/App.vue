<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import MyReports from "./components/MyReports.vue";
import FindOwner from "./components/FindOwner.vue";
import PointsSummary from "./components/PointsSummary.vue";
import Messages from "./components/Messages.vue";
import { client } from "./client";

const username = ref("");
const password = ref("");
const userId = ref("");
const session = ref(sessionStorage.getItem("session") ?? "");
const mode = ref<"login" | "register">("login");
const page = ref("My Missing Reports");
const message = ref("");
const busy = ref(false);
const messageError = ref(false);
const content = ref<HTMLElement | null>(null);

const pointsVersion = ref(0);

const pages = ["My Missing Reports", "Find an Owner", "Messages"];

function clearSession() {
  session.value = "";
  userId.value = "";
  sessionStorage.removeItem("session");
  selectedConversation.value = "";
  page.value = "My Missing Reports";
}

async function submit() {
  busy.value = true;
  message.value = "";
  messageError.value = false;

  try {
    const credentials = {
      username: username.value,
      password: password.value,
    };

    if (mode.value === "register") {
      const result = await client.auth.register(credentials);

      if ("error" in result) {
        throw new Error(
          result.error === "CONFLICT"
            ? "That username is already taken."
            : result.error === "INVALID_REQUEST"
              ? "Use a valid username and a password with 8–128 characters."
              : `Registration failed: ${result.error}`,
        );
      }

      mode.value = "login";
      message.value = "Account created. You can now log in.";
    } else {
      const result = await client.auth.login(credentials);

      if ("error" in result) {
        throw new Error(
          result.error === "UNAUTHORIZED"
            ? "The username or password is incorrect."
            : `Login failed: ${result.error}`,
        );
      }

      const current = await client.auth.current({
        session: result.session,
      });

      if ("error" in current) {
        throw new Error(
          `Could not verify your session: ${current.error}`,
        );
      }

      session.value = result.session;
      userId.value = current.user;
      sessionStorage.setItem("session", result.session);
    }
  } catch (error) {
    messageError.value = true;
    if (mode.value === "login") clearSession();

    message.value =
      error instanceof Error
        ? error.message
        : "Something went wrong.";
  } finally {
    password.value = "";
    busy.value = false;
  }
}

async function logout() {
  busy.value = true;
  message.value = "";
  messageError.value = false;

  try {
    const result = await client.auth.logout({
      session: session.value,
    });

    if (
      "error" in result &&
      result.error !== "UNAUTHORIZED"
    ) {
      throw new Error(`Logout failed: ${result.error}`);
    }

    // An already-invalid session also leaves us logged out.
    clearSession();
    message.value = "You have logged out.";
  } catch (error) {
    messageError.value = true;
    message.value =
      error instanceof Error
        ? error.message
        : "Logout failed.";
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  if (!session.value) return;

  busy.value = true;

  try {
    const result = await client.auth.current({
      session: session.value,
    });

    if ("error" in result) {
      if (result.error === "UNAUTHORIZED") {
        clearSession();
        messageError.value = true;
        message.value = "Please log in again.";
      } else {
        messageError.value = true;
        message.value =
          `Could not restore your session: ${result.error}`;
      }

      return;
    }

    userId.value = result.user;
  } catch (error) {
    messageError.value = true;
    message.value =
      error instanceof Error
        ? error.message
        : "Could not restore your session.";
  } finally {
    busy.value = false;
  }
});

const selectedConversation = ref("");

async function navigate(destination: string) {
  page.value = destination;
  pointsVersion.value++;
  await nextTick();
  content.value?.querySelector<HTMLElement>("h2")?.focus();
}

function showConversation(conversation: string) {
  selectedConversation.value = conversation;
  void navigate("Messages");
}
</script>

<template>
  <div class="shell">
    <a class="skip-link" href="#main-content">Skip to content</a>
    <header class="site-header">
      <div class="brand"><span class="brand-mark" aria-hidden="true">↶</span> Backtrack</div>
      <div class="header-actions" :class="{ 'logged-in': !!userId }">
        <PointsSummary v-if="userId" :key="session" :session="session" :refresh-key="pointsVersion" />
        <span v-else class="hint">Campus lost &amp; found</span>
        <button v-if="userId" :disabled="busy" @click="logout">Log out</button>
      </div>
    </header>

    <nav v-if="userId" class="app-nav" aria-label="Main navigation">
      <button v-for="item in pages" :key="item" :aria-pressed="page === item" @click="navigate(item)">
        {{ item }}
      </button>
    </nav>

    <main id="main-content" ref="content" tabindex="-1">
      <h1 v-if="userId" class="sr-only">Backtrack</h1>
      <p v-if="busy && session && !userId" class="loading" role="status">Restoring your session…</p>
      <div v-else-if="!userId" class="auth-layout">
        <section class="auth-intro">
          <p class="eyebrow">A little help finding your way back</p>
          <h1>Lost something?<br />Let’s backtrack.</h1>
          <p>One place to report what’s missing, find a potential owner, and arrange a return.</p>
          <ul class="auth-steps">
            <li><span aria-hidden="true">01</span> Report a missing item privately.</li>
            <li><span aria-hidden="true">02</span> Search or save something you found.</li>
            <li><span aria-hidden="true">03</span> Connect and coordinate a return.</li>
          </ul>
        </section>
        <section class="panel" aria-labelledby="auth-title" :aria-busy="busy">
          <h2 id="auth-title">{{ mode === "login" ? "Welcome back" : "Join Backtrack" }}</h2>
          <form @submit.prevent="submit">
            <div class="field"><label>Username
              <input v-model="username" autocomplete="username" pattern="[A-Za-z0-9_-]{3,32}"
                aria-describedby="username-help" required :disabled="busy" />
            </label><small id="username-help" class="hint">3–32 letters, numbers, underscores, or hyphens.</small></div>
            <div class="field"><label>Password
              <input v-model="password" type="password" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
                minlength="8" maxlength="128" aria-describedby="password-help" required :disabled="busy" />
            </label><small id="password-help" class="hint">8–128 characters.</small></div>
            <button class="primary" :disabled="busy">{{ busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account" }}</button>
          </form>
          <div class="actions">
            <button class="quiet" type="button" :disabled="busy" @click="mode = mode === 'login' ? 'register' : 'login'; message = ''">
              {{ mode === "login" ? "New here? Create an account" : "Already registered? Log in" }}
            </button>
          </div>
        </section>
      </div>
      <template v-else>
        <MyReports v-if="page === 'My Missing Reports'" :session="session" @contact="showConversation" />
        <FindOwner v-else-if="page === 'Find an Owner'" :session="session" @contact="showConversation" />
        <Messages v-else-if="page === 'Messages'" :session="session" :user-id="userId" :initial-conversation="selectedConversation" @return-updated="pointsVersion++" />
      </template>
      <p v-if="message" class="status" :class="{ error: messageError }" :role="messageError ? 'alert' : 'status'">{{ message }}</p>
    </main>
    <footer class="footer-note">Backtrack · A campus community helping things find their way home.</footer>
  </div>
</template>
