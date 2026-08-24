import { test } from "node:test";
import assert from "node:assert/strict";
import { mention, hashtag, cashtag, url, textLink, textMention, phone, reaction } from "../src/filters";
import { Composer } from "../src/composer";
import { Context } from "../src/context";
import { Api, Transport } from "../src/client";
import type { Update, User, Message, MessageEntity } from "../src/types";

const fakeBotInfo: User = { id: 1, is_bot: true, first_name: "TestBot" };
const fakeApi = new Api(new Transport("fake-token"));

function ctxWithEntities(text: string, entities: MessageEntity[]): Context {
  const message: Message = {
    message_id: 1, date: Date.now() / 1000,
    chat: { id: 1, type: "private", first_name: "Alice" },
    from: { id: 2, is_bot: false, first_name: "Alice" },
    text, entities,
  };
  return new Context({ update_id: 1, message }, fakeApi, fakeBotInfo);
}

test("mention()/hashtag()/cashtag()/url()/textLink()/textMention()/phone() each match only their own entity type", () => {
  const cases: [ReturnType<typeof mention>, MessageEntity["type"]][] = [
    [mention(), "mention"],
    [hashtag(), "hashtag"],
    [cashtag(), "cashtag"],
    [url(), "url"],
    [textLink(), "text_link"],
    [textMention(), "text_mention"],
    [phone(), "phone_number"],
  ];

  for (const [filter, type] of cases) {
    const matchingCtx = ctxWithEntities("some text", [{ type, offset: 0, length: 4 }]);
    assert.equal(filter(matchingCtx), true, `${type} filter should match its own entity type`);

    // Should NOT match a different entity type
    const otherType = type === "mention" ? "hashtag" : "mention";
    const nonMatchingCtx = ctxWithEntities("some text", [{ type: otherType, offset: 0, length: 4 }]);
    assert.equal(filter(nonMatchingCtx), false, `${type} filter should not match a different entity type (${otherType})`);
  }
});

test("filters work with bot.on(filter()) directly, matching telegraf's ergonomics", async () => {
  const composer = new Composer<Context>();
  let hit = false;
  composer.on(hashtag(), () => { hit = true; });

  await composer.handle(ctxWithEntities("#news update", [{ type: "hashtag", offset: 0, length: 5 }]));
  assert.equal(hit, true);

  hit = false;
  await composer.handle(ctxWithEntities("no hashtag here", []));
  assert.equal(hit, false);
});

test("reaction() matches any message_reaction update, or a specific emoji when given one", () => {
  const anyReactionUpdate: Update = {
    update_id: 1,
    message_reaction: {
      chat: { id: 1, type: "private", first_name: "A" },
      message_id: 1,
      date: Date.now() / 1000,
      old_reaction: [],
      new_reaction: [{ type: "emoji", emoji: "👍" }],
    },
  };
  const ctx = new Context(anyReactionUpdate, fakeApi, fakeBotInfo);

  assert.equal(reaction()(ctx), true, "reaction() with no args should match any reaction update");
  assert.equal(reaction("👍")(ctx), true, "reaction('👍') should match when 👍 is in new_reaction");
  assert.equal(reaction("🔥")(ctx), false, "reaction('🔥') should not match when only 👍 is present");

  const textCtx = ctxWithEntities("hi", []);
  assert.equal(reaction()(textCtx), false, "reaction() should not match a plain text update");
});
