import Database from '@tauri-apps/plugin-sql';

/**
 * LocalDB handles the SQLite database on the user's machine.
 */
class LocalDB {
    private db: Database | null = null;
    private dbPath = 'sqlite:schro.db';

    async getDb() {
        if (!this.db) {
            this.db = await Database.load(this.dbPath);
        }
        return this.db;
    }

    /**
     * Initializes the database schema.
     * We create tables locally that mirror our Supabase tables.
     */
    async init() {
        const db = await this.getDb();
        
        console.log('[LocalDB] Initializing Schema...');

        // Example: Finances Table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS finances (
                id TEXT PRIMARY KEY,
                amount REAL,
                category TEXT,
                description TEXT,
                date TEXT,
                synced INTEGER DEFAULT 0
            )
        `);

        // Example: Tasks Table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT,
                completed INTEGER DEFAULT 0,
                priority INTEGER DEFAULT 2,
                category TEXT,
                synced INTEGER DEFAULT 0
            )
        `);

        console.log('[LocalDB] Schema Ready.');
    }

    /**
     * Helper for raw queries
     */
    async query<T>(sql: string, bindValues?: any[]): Promise<T[]> {
        const db = await this.getDb();
        return await db.select(sql, bindValues);
    }

    /**
     * Helper for executions (INSERT, UPDATE, DELETE)
     */
    async execute(sql: string, bindValues?: any[]) {
        const db = await this.getDb();
        return await db.execute(sql, bindValues);
    }
}

export const localDb = new LocalDB();
