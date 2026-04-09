import Database from '@tauri-apps/plugin-sql';

/**
 * LocalDB handles the SQLite database on the user's machine.
 */
class LocalDB {
    private db: Database | null = null;
    private dbPath = 'sqlite:schro.db';
    private initPromise: Promise<void> | null = null;

    async getDb() {
        if (!this.db) {
            this.db = await Database.load(this.dbPath);
        }
        return this.db;
    }

    async ensureInitialized() {
        if (this.initPromise) await this.initPromise;
    }

    async init() {
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = (async () => {
            const db = await this.getDb();
        
        console.log('[LocalDB] Initializing Schema...');

        // Transactions & Ledger
        await db.execute(`
            CREATE TABLE IF NOT EXISTS finances (
                id TEXT PRIMARY KEY,
                amount REAL NOT NULL,
                category TEXT,
                sub_category TEXT,
                vendor TEXT,
                description TEXT,
                date TEXT NOT NULL,
                type TEXT DEFAULT 'expense',
                is_recurring INTEGER DEFAULT 0,
                recurrence_rule TEXT,
                is_fixed INTEGER DEFAULT 0,
                payment_method TEXT,
                status TEXT DEFAULT 'completed',
                receipt_url TEXT,
                user_id TEXT,
                synced INTEGER DEFAULT 1
            )
        `);

        // Comprehensive Tasks Table mirroring Supabase
        await db.execute(`
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                priority TEXT,
                due_date TEXT,
                due_date_mode TEXT,
                end_date TEXT,
                recurrence_config TEXT,
                amount REAL,
                notes TEXT,
                strategic_category TEXT,
                estimated_duration INTEGER,
                impact_score INTEGER,
                travel_to_duration INTEGER,
                travel_from_duration INTEGER,
                start_time TEXT,
                location TEXT,
                origin_location TEXT,
                is_completed INTEGER DEFAULT 0,
                category TEXT NOT NULL,
                profile TEXT NOT NULL,
                user_id TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                position REAL,
                synced INTEGER DEFAULT 1
            )
        `);
        
        // Wellbeing Logs (Gym, etc.)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS wellbeing_logs (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                value REAL,
                unit TEXT,
                metadata TEXT,
                date TEXT NOT NULL,
                user_id TEXT,
                synced INTEGER DEFAULT 1
            )
        `);

        // Reflections & Journaling
        await db.execute(`
            CREATE TABLE IF NOT EXISTS reflections (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                mood TEXT,
                tags TEXT,
                date TEXT NOT NULL,
                user_id TEXT,
                synced INTEGER DEFAULT 1
            )
        `);

        // Strategic Goals & Aspirations
        await db.execute(`
            CREATE TABLE IF NOT EXISTS goals (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'active',
                priority INTEGER DEFAULT 2,
                progress REAL DEFAULT 0,
                deadline TEXT,
                user_id TEXT,
                synced INTEGER DEFAULT 1
            )
        `);

        // Local Wellbeing Sync (State-based)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS wellbeing_cache (
                user_id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                updated_at TEXT
            )
        `);

        // Studio Projects
        await db.execute(`
            CREATE TABLE IF NOT EXISTS studio_projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                status TEXT,
                tags TEXT,
                user_id TEXT,
                synced INTEGER DEFAULT 1
            )
        `);

        // Studio Maps (Canvas)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS studio_maps (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                data TEXT, -- JSON blob for nodes/edges
                project_id TEXT,
                user_id TEXT,
                synced INTEGER DEFAULT 1
            )
        `);

        // Studio Sparks
        await db.execute(`
            CREATE TABLE IF NOT EXISTS studio_sparks (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                user_id TEXT,
                synced INTEGER DEFAULT 1
            )
        `);

        // Studio Milestones
        await db.execute(`
            CREATE TABLE IF NOT EXISTS studio_milestones (
                id TEXT PRIMARY KEY,
                project_id TEXT,
                title TEXT NOT NULL,
                impact_score INTEGER,
                status TEXT,
                user_id TEXT,
                synced INTEGER DEFAULT 1
            )
        `);

        // Studio Content
        await db.execute(`
            CREATE TABLE IF NOT EXISTS studio_content (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                category TEXT,
                status TEXT,
                user_id TEXT,
                synced INTEGER DEFAULT 1
            )
        `);

        // Studio Press
        await db.execute(`
            CREATE TABLE IF NOT EXISTS studio_press (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                organization TEXT,
                status TEXT,
                user_id TEXT,
                synced INTEGER DEFAULT 1
            )
        `);

        // Studio Drafts
        await db.execute(`
            CREATE TABLE IF NOT EXISTS studio_drafts (
                id TEXT PRIMARY KEY,
                title TEXT,
                content TEXT,
                status TEXT,
                is_archived INTEGER DEFAULT 0,
                user_id TEXT,
                synced INTEGER DEFAULT 1
            )
        `);

        // Studio Networks
        await db.execute(`
            CREATE TABLE IF NOT EXISTS studio_networks (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT,
                contact_info TEXT,
                user_id TEXT,
                synced INTEGER DEFAULT 1
            )
        `);

        // Finance Pockets (Savings Pots)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS pockets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                balance REAL DEFAULT 0,
                target_amount REAL DEFAULT 0,
                profile TEXT,
                sort_order INTEGER DEFAULT 0,
                user_id TEXT,
                synced INTEGER DEFAULT 1
            )
        `);

        console.log('[LocalDB] Schema Ready.');
        })();

        return this.initPromise;
    }


    /**
     * Helper for raw queries
     */
    async query<T>(sql: string, bindValues?: any[]): Promise<T[]> {
        await this.ensureInitialized();
        const db = await this.getDb();
        return await db.select(sql, bindValues);
    }

    /**
     * Helper for executions (INSERT, UPDATE, DELETE)
     */
    async execute(sql: string, bindValues?: any[]) {
        await this.ensureInitialized();
        const db = await this.getDb();
        return await db.execute(sql, bindValues);
    }
}

export const localDb = new LocalDB();
