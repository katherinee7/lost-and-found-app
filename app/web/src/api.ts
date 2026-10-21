export async function api(
  path: string,
  session: string,
  body: Record<string, unknown> = {},
) {
  const response = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, session }),
  });

  const text = await response.text();

  if (!text) {
    throw new Error(
      `Empty server response (HTTP ${response.status}).`,
    );
  }

  const result = JSON.parse(text);

  if (!response.ok || result.error) {
    const messages: Record<string, string> = {
      UNAUTHORIZED: "Please log out and log in again.",
      NOT_FOUND:
        "That report or conversation is unavailable. " +
        "You cannot contact yourself.",
      INVALID_REQUEST: "Check your input and try again.",
    };

    throw new Error(
      messages[result.error] ?? "The request failed.",
    );
  }

  return result;
}
