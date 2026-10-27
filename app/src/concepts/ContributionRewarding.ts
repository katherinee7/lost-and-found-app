import { MongoServerError, type Collection, type Db } from "mongodb";

export class InvalidContribution extends Error {}
export class ContributionUnavailable extends Error {}
export class ContributionConflict extends Error {}

interface Entry {
  _id: string;
  contributor: string;
  recipient: string;
  confirmations: string[];
  rewarded: boolean;
}

export interface ContributionStatus {
  registered: boolean;
  contributorConfirmed: boolean;
  recipientConfirmed: boolean;
  rewarded: boolean;
  role: "contributor" | "recipient";
}

function output(entry: Entry | null, user: string, recipient: string) {
  const status: ContributionStatus = {
    registered: !!entry,
    contributorConfirmed: !!entry?.confirmations.includes(entry.contributor),
    recipientConfirmed: !!entry?.confirmations.includes(entry.recipient),
    rewarded: entry?.rewarded ?? false,
    role: user === recipient ? "recipient" : "contributor",
  };
  return { status, rewarded: status.rewarded, recipient };
}

/** One completed contribution is one point; no separately incremented balance. */
export class ContributionRewardingConcept {
  private readonly entries: Collection<Entry>;
  private readonly intentions: Collection<Entry>;

  constructor(db: Db) {
    this.entries = db.collection<Entry>("contributionrewarding.entries");
    this.intentions = db.collection<Entry>("contributionrewarding.intentions");
  }

  async register({ user, contribution, contributor, recipient }: {
    user: string; contribution: string; contributor: string; recipient: string;
  }) {
    if (contributor === recipient) throw new InvalidContribution("A contribution needs two distinct participants.");
    if (user !== recipient) throw new ContributionUnavailable("Only the recipient can register this contribution.");
    try {
      await this.entries.updateOne(
        { _id: contribution },
        { $setOnInsert: { contributor, recipient, confirmations: [], rewarded: false } },
        { upsert: true },
      );
    } catch (error) {
      if (!(error instanceof MongoServerError && error.code === 11000)) throw error;
    }
    const entry = await this.entries.findOne({ _id: contribution });
    if (!entry || entry.contributor !== contributor || entry.recipient !== recipient) {
      throw new ContributionConflict("This contribution is registered with another participant.");
    }
    return output(entry, user, recipient);
  }

  async confirm({ user, contribution, contributor }: {
    user: string; contribution: string; contributor: string;
  }) {
    // Both the membership check and completion are in one atomic document update.
    const entry = await this.entries.findOneAndUpdate(
      { _id: contribution, contributor, $or: [{ contributor: user }, { recipient: user }] },
      [
        { $set: { confirmations: { $setUnion: ["$confirmations", [{ $literal: user }]] } } },
        { $set: { rewarded: { $and: [
          { $in: ["$contributor", "$confirmations"] },
          { $in: ["$recipient", "$confirmations"] },
        ] } } },
      ],
      { returnDocument: "after" },
    );
    if (!entry) throw new ContributionUnavailable("That contribution is unavailable to you in this context.");
    return output(entry, user, entry.recipient);
  }

  async acknowledge({ user, contribution, contributor, recipient }: {
    user: string; contribution: string; contributor: string; recipient: string;
  }) {
    if (contributor === recipient) throw new InvalidContribution("A contribution needs two distinct participants.");
    if (user !== contributor && user !== recipient) throw new ContributionUnavailable("That contribution is unavailable to you in this context.");
    // A finder's intention does not reserve the contribution. Only the recipient
    // selects its contributor; old registrations remain valid selections.
    await this.status({ user, contribution, contributor, recipient });
    // Select before recording the recipient's intention: a crash here leaves
    // their confirmation visibly pending and retryable, never a phantom "done".
    if (user === recipient) await this.register({ user, contribution, contributor, recipient });
    const _id = JSON.stringify([contribution, contributor, recipient]);
    try {
      await this.intentions.updateOne({ _id }, {
        $setOnInsert: { contributor, recipient, rewarded: false },
        $addToSet: { confirmations: user },
      }, { upsert: true });
    } catch (error) {
      if (!(error instanceof MongoServerError && error.code === 11000)) throw error;
      await this.intentions.updateOne({ _id }, { $addToSet: { confirmations: user } });
    }
    const selected = await this.entries.findOne({ _id: contribution });
    if (selected) {
      if (selected.contributor !== contributor || selected.recipient !== recipient) {
        throw new ContributionConflict("This contribution is registered with another participant.");
      }
      const intention = await this.intentions.findOne({ _id });
      const entry = await this.entries.findOneAndUpdate({ _id: contribution, contributor, recipient }, [
        { $set: { confirmations: { $setUnion: ["$confirmations", { $literal: intention!.confirmations }] } } },
        { $set: { rewarded: { $and: [
          { $in: ["$contributor", "$confirmations"] }, { $in: ["$recipient", "$confirmations"] },
        ] } } },
      ], { returnDocument: "after" });
      return output(entry, user, recipient);
    }
    return this.status({ user, contribution, contributor, recipient });
  }

  async status({ user, contribution, contributor, recipient }: {
    user: string; contribution: string; contributor: string; recipient: string;
  }) {
    if (contributor === recipient) throw new InvalidContribution("A contribution needs two distinct participants.");
    if (user !== contributor && user !== recipient) throw new ContributionUnavailable("That contribution is unavailable to you in this context.");
    const entry = await this.entries.findOne({ _id: contribution });
    if (entry && (entry.contributor !== contributor || entry.recipient !== recipient)) {
      throw new ContributionConflict("This contribution is registered with another participant.");
    }
    const intention = entry ? null : await this.intentions.findOne({ _id: JSON.stringify([contribution, contributor, recipient]) });
    return output(entry ?? intention, user, recipient);
  }

  async balance({ user }: { user: string }) {
    return { points: await this.entries.countDocuments({ contributor: user, rewarded: true }) };
  }
}
