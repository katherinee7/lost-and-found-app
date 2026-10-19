<script setup lang="ts">
import { onMounted, ref } from "vue";

const username = ref("");
const password = ref("");
const userId = ref("");
const session = ref(sessionStorage.getItem("session") ?? "");
const mode = ref<"login" | "register">("login");
const page = ref("My Reports");
const message = ref("");
const busy = ref(false);

const pages = ["My Reports", "Find an Owner", "Messages"];

async function request(
  path: string,
  body: Record<string, string>,
): Promise<Record<string, unknown>> {
  const response = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const result = await response.json();

  if (!response.ok || result.error) {
    if (result.error === "CONFLICT") {
      throw new Error("That username is already taken.");
    }

    if (result.error === "UNAUTHORIZED") {
      throw new Error("Incorrect credentials or an inactive session.");
    }

    if (result.error === "INVALID_REQUEST") {
      throw new Error(
        "Use a username with 3–32 letters, numbers, underscores, " +
        "or hyphens, and a password with 8–128 characters.",
      );
    }

    throw new Error("The request failed. Please try again.");
  }

  return result;
}

function clearSession() {
  session.value = "";
  userId.value = "";
  sessionStorage.removeItem("session");
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
      await request("/auth/register", credentials);
      mode.value = "login";
      message.value = "Account created. You can now log in.";
    } else {
      const result = await request("/auth/login", credentials);

      if (typeof result.session !== "string") {
        throw new Error("The server returned an invalid session.");
      }

      session.value = result.session;
      sessionStorage.setItem("session", result.session);

      const current = await request("/auth/current", {
        session: session.value,
      });

      if (typeof current.user !== "string") {
        throw new Error("The server returned an invalid user.");
      }

      userId.value = current.user;
    }
  } catch (error) {
    if (mode.value === "login") clearSession();

    message.value =
      error instanceof Error ? error.message : "Something went wrong.";
  } finally {
    password.value = "";
    busy.value = false;
  }
}

async function logout() {
  busy.value = true;
  message.value = "";

  try {
    await request("/auth/logout", { session: session.value });
    clearSession();
    message.value = "You have logged out.";
  } catch (error) {
    message.value =
      error instanceof Error ? error.message : "Logout failed.";
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  if (!session.value) return;

  busy.value = true;

  try {
    const current = await request("/auth/current", {
      session: session.value,
    });

    if (typeof current.user !== "string") {
      throw new Error("Invalid session response.");
    }

    userId.value = current.user;
  } catch {
    clearSession();
    message.value = "Please log in again.";
  } finally {
    busy.value = false;
  }
});
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

      <section>
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
