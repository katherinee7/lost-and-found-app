import { MongoServerError, type Collection, type Db } from "mongodb";

export class LinkUnavailable extends Error {}
export class LinkConflict extends Error {}

interface LinkDocument {
  _id: string;
  initiator: string;
  context: string;
  conversation: string;
  source?: string;
}

/** Reserve stable identifiers without knowing what the context represents. */
export class ConversationLinkingConcept {
  private readonly links: Collection<LinkDocument>;
  private indexesReady?: Promise<string>;

  constructor(db: Db) {
    this.links = db.collection<LinkDocument>("conversationlinking.links");
  }

  async resolve({ initiator, context }: { initiator: string; context: string }) {
    this.indexesReady ??= this.links.createIndex({ conversation: 1 }, { unique: true });
    await this.indexesReady;
    // An unambiguous tuple is the primary key; uniqueness works across processes.
    const _id = JSON.stringify([initiator, context]);
    try {
      await this.links.updateOne(
        { _id },
        { $setOnInsert: { initiator, context, conversation: crypto.randomUUID() } },
        { upsert: true },
      );
    } catch (error) {
      // A simultaneous upsert may have inserted the canonical mapping first.
      if (!(error instanceof MongoServerError && error.code === 11000)) throw error;
    }
    const link = await this.links.findOne({ _id });
    if (!link) throw new Error("Conversation link was not created.");
    return { conversation: link.conversation };
  }

  async get({ conversation }: { conversation: string }) {
    const link = await this.links.findOne({ conversation });
    if (!link) throw new LinkUnavailable("That conversation has no linked context.");
    return { context: link.context, initiator: link.initiator };
  }

  async attach({ conversation, source }: { conversation: string; source: string }) {
    const result = await this.links.updateOne(
      { conversation, $or: [{ source: { $exists: false } }, { source }] },
      { $set: { source } },
    );
    if (!result.matchedCount) throw new LinkConflict("This conversation is already linked to another source or is unavailable.");
    return { conversation };
  }

  async source({ conversation }: { conversation: string }) {
    const link = await this.links.findOne({ conversation });
    if (!link) throw new LinkUnavailable("That conversation has no linked context.");
    return { hasSource: !!link.source, source: link.source ?? "" };
  }

  async _context({ conversation }: { conversation: string }) {
    const link = await this.links.findOne({ conversation });
    return link ? [{ context: link.context }] : [];
  }
}
