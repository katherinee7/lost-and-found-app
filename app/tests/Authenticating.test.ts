import {
  afterAll,
  beforeAll,
  beforeEach,
  expect,
  test,
} from "bun:test";
import { MongoClient } from "mongodb";
import {
  AuthenticatingConcept,
  InvalidCredentials,
  InvalidUsername,
  UnknownSession,
  UsernameTaken,
  WeakPassword,
} from "../src/concepts/Authenticating.ts";

const url = process.env.MONGODB_URL;

if (!url) {
  throw new Error("MONGODB_URL is missing from .env");
}

const client = new MongoClient(url);
const db = client.db(
  `backtrack_test_${crypto.randomUUID().replaceAll("-", "")}`,
);
let auth: AuthenticatingConcept;

beforeAll(async () => {
  await client.connect();
});

beforeEach(async () => {
  await db.dropDatabase();
  auth = new AuthenticatingConcept(db);
});

afterAll(async () => {
  try {
    await db.dropDatabase();
  } finally {
    await client.close();
  }
});

test("register, log in, authenticate, and log out", async () => {
  const { user } = await auth.register({
    username: "alex",
    password: "calculator123",
  });

  const { session } = await auth.login({
    username: "alex",
    password: "calculator123",
  });

  expect(await auth.authenticate({ session })).toEqual({ user });

  // A new concept instance can retrieve the persisted session.
  const anotherInstance = new AuthenticatingConcept(db);
  expect(await anotherInstance.authenticate({ session }))
    .toEqual({ user });

  expect(await auth.logout({ session })).toEqual({ ended: true });

  await expect(auth.authenticate({ session }))
    .rejects.toBeInstanceOf(UnknownSession);
});

test("rejects duplicate usernames", async () => {
  const credentials = {
    username: "maya",
    password: "strongpassword",
  };

  await auth.register(credentials);

  await expect(auth.register(credentials))
    .rejects.toBeInstanceOf(UsernameTaken);
});

test("rejects incorrect credentials", async () => {
  await auth.register({
    username: "sam",
    password: "correctpassword",
  });

  await expect(
    auth.login({ username: "sam", password: "wrongpassword" }),
  ).rejects.toBeInstanceOf(InvalidCredentials);

  await expect(
    auth.login({ username: "unknown", password: "wrongpassword" }),
  ).rejects.toBeInstanceOf(InvalidCredentials);
});

test("rejects invalid registration inputs", async () => {
  await expect(
    auth.register({ username: "a", password: "strongpassword" }),
  ).rejects.toBeInstanceOf(InvalidUsername);

  await expect(
    auth.register({ username: "validname", password: "short" }),
  ).rejects.toBeInstanceOf(WeakPassword);
});

test("rejects invented sessions", async () => {
  await expect(auth.authenticate({ session: "invented" }))
    .rejects.toBeInstanceOf(UnknownSession);

  await expect(auth.logout({ session: "invented" }))
    .rejects.toBeInstanceOf(UnknownSession);
});
