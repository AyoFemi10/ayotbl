import { SessionStore } from "./session";

/**
 * Duck-typed on purpose: works with `better-sqlite3` (the common choice for
 * self-hosted bots that don't want to run Redis) without a hard dependency
 * on it. Any object exposing this synchronous shape works — including an
 * in-memory fake for tests.
 */
export interface SqliteLikeDatabase {
  exec(sql: string): unknown;
  prepare(sql: string): {
    run(...params: unknown[]): unknown;
    get(...params: unknown[]): unknown;
  };
}

export interface SqliteSessionStoreOptions {
  /** Table name to store sessions in. Must be a plain identifier (letters, numbers, underscores) — validated to avoid building unsafe SQL. Default: "ayotbl_sessions". */
  tableName?: string;
}

const VALID_TABLE_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export class SqliteSessionStore<S = unknown> implements SessionStore<S> {
  private tableName: string;
  private getStmt: ReturnType<SqliteLikeDatabase["prepare"]>;
  private setStmt: ReturnType<SqliteLikeDatabase["prepare"]>;
  private deleteStmt: ReturnType<SqliteLikeDatabase["prepare"]>;

  constructor(private db: SqliteLikeDatabase, opts: SqliteSessionStoreOptions = {}) {
    this.tableName = opts.tableName ?? "ayotbl_sessions";
    if (!VALID_TABLE_NAME.test(this.tableName)) {
      throw new Error(`ayotbl: invalid SqliteSessionStore tableName "${this.tableName}" — must match ${VALID_TABLE_NAME}`);
    }
    this.db.exec(`CREATE TABLE IF NOT EXISTS ${this.tableName} (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
    this.getStmt = this.db.prepare(`SELECT value FROM ${this.tableName} WHERE key = ?`);
    this.setStmt = this.db.prepare(
      `INSERT INTO ${this.tableName} (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    );
    this.deleteStmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE key = ?`);
  }

  get(key: string): S | undefined {
    const row = this.getStmt.get(key) as { value: string } | undefined;
    return row ? (JSON.parse(row.value) as S) : undefined;
  }

  set(key: string, value: S): void {
    this.setStmt.run(key, JSON.stringify(value));
  }

  delete(key: string): void {
    this.deleteStmt.run(key);
  }
}
