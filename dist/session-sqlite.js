"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteSessionStore = void 0;
const VALID_TABLE_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
class SqliteSessionStore {
    db;
    tableName;
    getStmt;
    setStmt;
    deleteStmt;
    constructor(db, opts = {}) {
        this.db = db;
        this.tableName = opts.tableName ?? "ayotbl_sessions";
        if (!VALID_TABLE_NAME.test(this.tableName)) {
            throw new Error(`ayotbl: invalid SqliteSessionStore tableName "${this.tableName}" — must match ${VALID_TABLE_NAME}`);
        }
        this.db.exec(`CREATE TABLE IF NOT EXISTS ${this.tableName} (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
        this.getStmt = this.db.prepare(`SELECT value FROM ${this.tableName} WHERE key = ?`);
        this.setStmt = this.db.prepare(`INSERT INTO ${this.tableName} (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`);
        this.deleteStmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE key = ?`);
    }
    get(key) {
        const row = this.getStmt.get(key);
        return row ? JSON.parse(row.value) : undefined;
    }
    set(key, value) {
        this.setStmt.run(key, JSON.stringify(value));
    }
    delete(key) {
        this.deleteStmt.run(key);
    }
}
exports.SqliteSessionStore = SqliteSessionStore;
//# sourceMappingURL=session-sqlite.js.map