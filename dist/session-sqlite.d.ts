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
export declare class SqliteSessionStore<S = unknown> implements SessionStore<S> {
    private db;
    private tableName;
    private getStmt;
    private setStmt;
    private deleteStmt;
    constructor(db: SqliteLikeDatabase, opts?: SqliteSessionStoreOptions);
    get(key: string): S | undefined;
    set(key: string, value: S): void;
    delete(key: string): void;
}
