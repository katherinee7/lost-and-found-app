import { MongoServerError, type Collection, type Db } from "mongodb";

export class InvalidUsername extends Error {}
export class WeakPassword extends Error {}
export class UsernameTaken extends Error {}
export class InvalidCredentials extends Error {}
export class UnknownSession extends Error {}

interface UserDocument {
  _id: string;
  username: string;
  passwordHash: string;
}

interface SessionDocument {
  _id: string;
  user: string;
}

export class AuthenticatingConcept {
  private readonly users: Collection<UserDocument>;
  private readonly sessions: Collection<SessionDocument>;
  private indexesReady?: Promise<string>;

  constructor(db: Db) {
    this.users = db.collection<UserDocument>("authenticating.users");
    this.sessions =
      db.collection<SessionDocument>("authenticating.sessions");
  }

  async register({
    username,
    password,
  }: {
    username: string;
    password: string;
  }) {
    if (!/^[A-Za-z0-9_-]{3,32}$/.test(username)) {
      throw new InvalidUsername(
        "Use 3–32 letters, numbers, underscores, or hyphens.",
      );
    }

    if (password.length < 8 || password.length > 128) {
      throw new WeakPassword(
        "Use a password with 8–128 characters.",
      );
    }

    // Enforce uniqueness in the database, including simultaneous requests.
    this.indexesReady ??= this.users.createIndex(
      { username: 1 },
      { unique: true },
    );
    await this.indexesReady;

    const user = crypto.randomUUID();
    const passwordHash = await Bun.password.hash(password, {
      algorithm: "argon2id",
    });

    try {
      await this.users.insertOne({
        _id: user,
        username,
        passwordHash,
      });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new UsernameTaken(
          "That username is already registered.",
        );
      }
      throw error;
    }

    return { user };
  }

  async login({
    username,
    password,
  }: {
    username: string;
    password: string;
  }) {
    const user = await this.users.findOne({ username });

    if (
      !user ||
      !(await Bun.password.verify(password, user.passwordHash))
    ) {
      throw new InvalidCredentials(
        "The username or password is incorrect.",
      );
    }

    const session = crypto.randomUUID();

    await this.sessions.insertOne({
      _id: session,
      user: user._id,
    });

    return { session };
  }

  async authenticate({ session }: { session: string }) {
    const existing = await this.sessions.findOne({ _id: session });

    if (!existing) {
      throw new UnknownSession("Please log in.");
    }

    return { user: existing.user };
  }

  async logout({ session }: { session: string }) {
    const result = await this.sessions.deleteOne({ _id: session });

    if (result.deletedCount === 0) {
      throw new UnknownSession("Please log in.");
    }

    return { ended: true };
  }
}
