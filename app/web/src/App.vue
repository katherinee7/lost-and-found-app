<script setup lang="ts">
import { onMounted, ref } from "vue";
import MyReports from "./components/MyReports.vue";
import FindOwner from "./components/FindOwner.vue";
import Messages from "./components/Messages.vue";
import { client } from "./client";

const username = ref("");
const password = ref("");
const userId = ref("");
const session = ref(sessionStorage.getItem("session") ?? "");
const mode = ref<"login" | "register">("login");
const page = ref("My Reports");
const message = ref("");
const busy = ref(false);

const pages = ["My Reports", "Find an Owner", "Messages"];

function clearSession() {
  session.value = "";
  userId.value = "";
  sessionStorage.removeItem("session");
  selectedConversation.value = "";
  page.value = "My Reports";
}

async function submit() {
  busy.value = true;
  message.value = "";

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
        message.value = "Please log in again.";
      } else {
        message.value =
          `Could not restore your session: ${result.error}`;
      }

      return;
    }

    userId.value = result.user;
  } catch (error) {
    message.value =
      error instanceof Error
        ? error.message
        : "Could not restore your session.";
  } finally {
    busy.value = false;
  }
});

const selectedConversation = ref("");

function showConversation(conversation: string) {
  selectedConversation.value = conversation;
  page.value = "Messages";
}
</script>

<template>
  <main>
    <h1>Backtrack</h1>

    <template v-if="!userId">
      <h2>{{ mode === "login" ? "Log in" : "Create an account" }}</h2>

      <form @submit.prevent="submit">
        <label>
          Username
          <input
            v-model="username"
            autocomplete="username"
            pattern="[A-Za-z0-9_-]{3,32}"
            title="Use 3–32 letters, numbers, underscores, or hyphens."
            required
          />
        </label>

        <label>
          Password
          <input
            v-model="password"
            type="password"
            :autocomplete="
              mode === 'login' ? 'current-password' : 'new-password'
            "
            minlength="8"
            maxlength="128"
            required
          />
        </label>

        <button :disabled="busy">
          {{ busy ? "Please wait…" : mode === "login" ? "Log in" : "Register" }}
        </button>
      </form>

      <button
        type="button"
        :disabled="busy"
        @click="
          mode = mode === 'login' ? 'register' : 'login';
          message = '';
        "
      >
        {{ mode === "login" ? "Create an account" : "Back to login" }}
      </button>
    </template>

    <template v-else>
      <p>You are logged in.</p>
      <button :disabled="busy" @click="logout">Log out</button>

      <nav>
        <button
          v-for="item in pages"
          :key="item"
          :aria-pressed="page === item"
          @click="page = item"
        >
          {{ item }}
        </button>
      </nav>

      <MyReports
        v-if="page === 'My Reports'"
        :session="session"
        @contact="showConversation"
      />

      <FindOwner
        v-else-if="page === 'Find an Owner'"
        :session="session"
        @contact="showConversation"
      />

      <Messages
        v-else-if="page === 'Messages'"
        :session="session"
        :user-id="userId"
        :initial-conversation="selectedConversation"
      />

      <section v-else>
        <h2>{{ page }}</h2>
        <p>This feature will be implemented next.</p>
      </section>
    </template>

    <p role="status">{{ message }}</p>
  </main>
</template>

<style scoped>
main {
  max-width: 600px;
  margin: 40px auto;
  padding: 20px;
  text-align: left;
}

form,
label {
  display: grid;
  gap: 8px;
}

form {
  gap: 16px;
  margin-bottom: 16px;
}

input {
  padding: 10px;
  font: inherit;
}

nav {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}

button {
  cursor: pointer;
}
</style>
