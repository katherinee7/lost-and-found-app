import { MongoServerError, type Collection, type Db } from "mongodb";

export class InvalidParticipants extends Error {}
export class InvalidMessage extends Error {}
export class ConversationUnavailable extends Error {}

interface Message {
  id: string;
  sender: string;
  text: string;
  sentAt: string;
}

interface ConversationDocument {
  _id: string;
  first: string;
  second: string;
  messages: Message[];
}

export class MessagingConcept {
  private readonly conversations:
    Collection<ConversationDocument>;

  constructor(db: Db) {
    this.conversations =
      db.collection<ConversationDocument>(
        "messaging.conversations",
      );
  }

  async create({
    first,
    second,
  }: {
    first: string;
    second: string;
  }) {
    if (first === second) {
      throw new InvalidParticipants(
        "Choose a different participant.",
      );
    }

    const conversation = crypto.randomUUID();

    await this.conversations.insertOne({
      _id: conversation,
      first,
      second,
      messages: [],
    });

    return { conversation };
  }

  async ensure({ conversation, first, second }: {
    conversation: string;
    first: string;
    second: string;
  }) {
    if (first === second) {
      throw new InvalidParticipants("Choose a different participant.");
    }
    try {
      await this.conversations.updateOne(
        {
          _id: conversation,
          $or: [{ first, second }, { first: second, second: first }],
        },
        { $setOnInsert: { first, second, messages: [] } },
        { upsert: true },
      );
    } catch (error) {
      if (!(error instanceof MongoServerError && error.code === 11000)) throw error;
      const existing = await this.conversations.findOne({ _id: conversation });
      if (!existing || !(
        (existing.first === first && existing.second === second) ||
        (existing.first === second && existing.second === first)
      )) {
        throw new InvalidParticipants("Choose a different participant.");
      }
    }
    return { conversation };
  }

  async checkParticipants({ conversation, first, second }: {
    conversation: string; first: string; second: string;
  }) {
    const found = first !== second && await this.conversations.findOne({
      _id: conversation,
      $or: [{ first, second }, { first: second, second: first }],
    }, { projection: { _id: 1 } });
    if (!found) throw new ConversationUnavailable("That conversation is unavailable.");
    return { conversation };
  }

  async send({
    sender,
    conversation,
    text,
  }: {
    sender: string;
    conversation: string;
    text: string;
  }) {
    if (
      typeof text !== "string" ||
      !text.trim() ||
      text.length > 2000
    ) {
      throw new InvalidMessage(
        "Messages must contain 1–2000 characters.",
      );
    }

    const message = crypto.randomUUID();

    // Membership and the message append are checked together.
    const result = await this.conversations.updateOne(
      {
        _id: conversation,
        $or: [{ first: sender }, { second: sender }],
      },
      {
        $push: {
          messages: {
            id: message,
            sender,
            text: text.trim(),
            sentAt: new Date().toISOString(),
          },
        },
      },
    );

    if (result.matchedCount === 0) {
      throw new ConversationUnavailable(
        "That conversation is unavailable.",
      );
    }

    return { message };
  }

  async read({
    user,
    conversation,
  }: {
    user: string;
    conversation: string;
  }) {
    const found = await this.conversations.findOne({
      _id: conversation,
      $or: [{ first: user }, { second: user }],
    });

    if (!found) {
      throw new ConversationUnavailable(
        "That conversation is unavailable.",
      );
    }

    return { messages: found.messages };
  }

  async _for({ user }: { user: string }) {
    const conversations = await this.conversations
      .find(
        {
          $or: [{ first: user }, { second: user }],
        },
        {
          projection: {
            _id: 1,
            first: 1,
            second: 1,
          },
        },
      )
      .toArray();

    return conversations.map((conversation) => ({
      conversation: conversation._id,
      other:
        conversation.first === user
          ? conversation.second
          : conversation.first,
    }));
  }
}
