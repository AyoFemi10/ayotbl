import { test } from "node:test";
import assert from "node:assert/strict";
import { SqliteSessionStore, SqliteLikeDatabase } from "../src/session-sqlite";

/**
 * Minimal in-memory fake implementing the same synchronous shape as
 * better-sqlite3's Database — lets us test SqliteSessionStore's actual SQL
 * logic (including the upsert path) without a real native dependency.
 */
class FakeSqliteDatabase implements SqliteLikeDatabase {
  private tables = new Map<string, Map<string, string>>();

  exec(sql: string): void {
    const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
    if (match && !this.tables.has(match[1])) this.tables.set(match[1], new Map());
  }

  prepare(sql: string) {
    const tableMatch = sql.match(/(?:FROM|INTO|DELETE FROM)\s+(\w+)/);
    const table = tableMatch ? this.tables.get(tableMatch[1]) ?? new Map() : new Map();
    if (tableMatch && !this.tables.has(tableMatch[1])) this.tables.set(tableMatch[1], table);

    return {
      run: (...params: unknown[]) => {
        if (sql.startsWith("INSERT")) {
          const [key, value] = params as [string, string];
          table.set(key, value);
        } else if (sql.startsWith("DELETE")) {
          const [key] = params as [string];
          table.delete(key);
        }
      },
      get: (...params: unknown[]) => {
        const [key] = params as [string];
        const value = table.get(key);
        return value !== undefined ? { value } : undefined;
      },
    };
  }
}

test("SqliteSessionStore stores and retrieves a value, round-tripped through JSON", () => {
  const db = new FakeSqliteDatabase();
  const store = new SqliteSessionStore<{ count: number }>(db);

  assert.equal(store.get("chat:1"), undefined);
  store.set("chat:1", { count: 3 });
  assert.deepEqual(store.get("chat:1"), { count: 3 });
});

test("SqliteSessionStore.set() upserts — setting the same key twice overwrites, not duplicates", () => {
  const db = new FakeSqliteDatabase();
  const store = new SqliteSessionStore<{ count: number }>(db);

  store.set("chat:1", { count: 1 });
  store.set("chat:1", { count: 2 });
  assert.deepEqual(store.get("chat:1"), { count: 2 });
});

test("SqliteSessionStore.delete() removes the key", () => {
  const db = new FakeSqliteDatabase();
  const store = new SqliteSessionStore<{ count: number }>(db);

  store.set("chat:1", { count: 5 });
  store.delete("chat:1");
  assert.equal(store.get("chat:1"), undefined);
});

test("SqliteSessionStore keeps separate keys independent", () => {
  const db = new FakeSqliteDatabase();
  const store = new SqliteSessionStore<{ count: number }>(db);

  store.set("chat:1", { count: 1 });
  store.set("chat:2", { count: 99 });
  assert.deepEqual(store.get("chat:1"), { count: 1 });
  assert.deepEqual(store.get("chat:2"), { count: 99 });
});

test("SqliteSessionStore rejects an invalid table name rather than building unsafe SQL", () => {
  const db = new FakeSqliteDatabase();
  assert.throws(() => new SqliteSessionStore(db, { tableName: "bad; DROP TABLE users;--" }), /invalid SqliteSessionStore tableName/);
});

test("SqliteSessionStore works end-to-end with the session() middleware", async () => {
  const { session } = await import("../src/session");
  const { Composer } = await import("../src/composer");
  const { Context } = await import("../src/context");
  const { Api, Transport } = await import("../src/client");

  const db = new FakeSqliteDatabase();
  const store = new SqliteSessionStore<{ count: number }>(db, { tableName: "custom_sessions" });
  const composer = new Composer<InstanceType<typeof Context>>();
  composer.use(session({ store, defaultSession: () => ({ count: 0 }) }));
  composer.use((ctx: any) => { ctx.session.count += 1; });

  const api = new Api(new Transport("fake-token"));
  const botInfo = { id: 1, is_bot: true, first_name: "Bot" };
  function ctxFor() {
    return new Context(
      { update_id: 1, message: { message_id: 1, date: 0, chat: { id: 42, type: "private", first_name: "A" }, text: "hi" } },
      api,
      botInfo as any
    );
  }

  await composer.handle(ctxFor());
  await composer.handle(ctxFor());
  await composer.handle(ctxFor());

  assert.deepEqual(store.get("42"), { count: 3 });
});
