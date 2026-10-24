import {
  afterAll,
  beforeAll,
  expect,
  test,
} from "bun:test";
import { MongoClient } from "mongodb";
import {
  MessagingConcept,
  InvalidParticipants,
  InvalidMessage,
  ConversationUnavailable,
} from "../src/concepts/Messaging.ts";

const url = process.env.MONGODB_URL;
if (!url) throw new Error("MONGODB_URL is missing.");

const client = new MongoClient(url);
const db = client.db(
  `backtrack_test_${crypto.randomUUID().replaceAll("-", "")}`,
);

const messaging = new MessagingConcept(db);

beforeAll(async () => {
  await client.connect();
});

afterAll(async () => {
  try {
    await db.dropDatabase();
  } finally {
    await client.close();
  }
});

test("participants can exchange messages in order", async () => {
  const { conversation } = await messaging.create({
    first: "alex",
    second: "maya",
  });

  await messaging.send({
    sender: "maya",
    conversation,
    text: "I found a calculator.",
  });

  await messaging.send({
    sender: "alex",
    conversation,
    text: "Thanks! Where did you find it?",
  });

  const { messages } = await messaging.read({
    user: "alex",
    conversation,
  });

  expect(messages.map(({ sender, text }) => ({ sender, text })))
    .toEqual([
      { sender: "maya", text: "I found a calculator." },
      {
        sender: "alex",
        text: "Thanks! Where did you find it?",
      },
    ]);

  const otherRead = await messaging.read({
    user: "maya",
    conversation,
  });

  expect(otherRead.messages).toEqual(messages);
});

test("nonparticipants cannot read or send messages", async () => {
  const { conversation } = await messaging.create({
    first: "owner",
    second: "finder",
  });

  await expect(
    messaging.read({ user: "stranger", conversation }),
  ).rejects.toBeInstanceOf(ConversationUnavailable);

  await expect(
    messaging.send({
      sender: "stranger",
      conversation,
      text: "Unauthorized message",
    }),
  ).rejects.toBeInstanceOf(ConversationUnavailable);

  const { messages } = await messaging.read({
    user: "owner",
    conversation,
  });

  expect(messages).toEqual([]);
});

test("lists only the user's conversations", async () => {
  const { conversation } = await messaging.create({
    first: "person-a",
    second: "person-b",
  });

  expect(await messaging._for({ user: "person-a" }))
    .toEqual([
      { conversation, other: "person-b" },
    ]);

  expect(await messaging._for({ user: "person-b" }))
    .toEqual([
      { conversation, other: "person-a" },
    ]);

  expect(await messaging._for({ user: "unrelated" }))
    .toEqual([]);
});

test("messages persist across concept instances", async () => {
  const { conversation } = await messaging.create({
    first: "persist-a",
    second: "persist-b",
  });

  await messaging.send({
    sender: "persist-a",
    conversation,
    text: "Saved message",
  });

  const anotherInstance = new MessagingConcept(db);

  const { messages } = await anotherInstance.read({
    user: "persist-b",
    conversation,
  });

  expect(messages[0]?.text).toBe("Saved message");
});

test("rejects invalid messages", async () => {
  const { conversation } = await messaging.create({
    first: "validation-a",
    second: "validation-b",
  });

  for (const text of ["   ", "x".repeat(2001)]) {
    await expect(
      messaging.send({
        sender: "validation-a",
        conversation,
        text,
      }),
    ).rejects.toBeInstanceOf(InvalidMessage);
  }
});

test("rejects conversations with yourself", async () => {
  await expect(
    messaging.create({ first: "same", second: "same" }),
  ).rejects.toBeInstanceOf(InvalidParticipants);
});

test("rejects unknown conversation IDs", async () => {
  await expect(
    messaging.read({
      user: "alex",
      conversation: "does-not-exist",
    }),
  ).rejects.toBeInstanceOf(ConversationUnavailable);
});

test("ensure reuses reserved identities simultaneously without replacing messages", async () => {
  const conversation = crypto.randomUUID();
  const instances = Array.from({ length: 8 }, () => new MessagingConcept(db));
  const results = await Promise.all(instances.map((instance) => instance.ensure({ conversation, first: "ensure-owner", second: "ensure-finder" })));
  expect(results).toEqual(instances.map(() => ({ conversation })));
  await messaging.send({ sender: "ensure-owner", conversation, text: "Keep this message" });
  await messaging.ensure({ conversation, first: "ensure-finder", second: "ensure-owner" });
  expect((await messaging.read({ user: "ensure-finder", conversation })).messages.map((m) => m.text)).toEqual(["Keep this message"]);
  expect(await db.collection("messaging.conversations").countDocuments({ _id: conversation })).toBe(1);
});

test("ensure rejects self conversations or changed participants without changing state", async () => {
  const conversation = crypto.randomUUID();
  await messaging.ensure({ conversation, first: "stable-a", second: "stable-b" });
  await messaging.send({ sender: "stable-a", conversation, text: "Original" });
  const original = await messaging.read({ user: "stable-a", conversation });
  await expect(messaging.ensure({ conversation, first: "stable-a", second: "intruder" })).rejects.toBeInstanceOf(InvalidParticipants);
  const unused = crypto.randomUUID();
  await expect(messaging.ensure({ conversation: unused, first: "same", second: "same" })).rejects.toBeInstanceOf(InvalidParticipants);
  expect(await db.collection("messaging.conversations").findOne({ _id: unused })).toBeNull();
  expect(await messaging.read({ user: "stable-b", conversation })).toEqual(original);
});
