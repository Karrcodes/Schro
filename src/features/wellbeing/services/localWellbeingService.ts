import { localDb } from '@/lib/local-db';

export const LocalWellbeingService = {
    /**
     * Get logs (Gym sessions, etc.)
     */
    async getLogs(type?: string, userId?: string) {
        let sql = 'SELECT * FROM wellbeing_logs';
        const params: any[] = [];
        const conditions: string[] = [];

        if (type) {
            conditions.push('type = ?');
            params.push(type);
        }
        if (userId) {
            conditions.push('user_id = ?');
            params.push(userId);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY date DESC';
        return await localDb.query<any>(sql, params);
    },

    /**
     * Sync Wellbeing logs from Supabase
     */
    async syncLogs(logs: any[]) {
        for (const log of logs) {
            await localDb.execute(`
                INSERT INTO wellbeing_logs (id, type, value, unit, metadata, date, user_id, synced)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                ON CONFLICT(id) DO UPDATE SET
                    value = excluded.value,
                    metadata = excluded.metadata,
                    date = excluded.date,
                    synced = 1
            `, [log.id, log.type, log.value, log.unit, log.metadata, log.date, log.user_id]);
        }
    },

    async saveLogLocally(log: any, synced = 0) {
        await localDb.execute(`
            INSERT INTO wellbeing_logs (id, type, value, unit, metadata, date, user_id, synced)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [log.id, log.type, log.value, log.unit, log.metadata, log.date, log.user_id, synced]);
    },

    /**
     * Reflections
     */
    async getReflections(userId?: string) {
        let sql = 'SELECT * FROM reflections';
        const params: any[] = [];
        if (userId) {
            sql += ' WHERE user_id = ?';
            params.push(userId);
        }
        sql += ' ORDER BY date DESC';
        return await localDb.query<any>(sql, params);
    },

    async syncReflections(refs: any[]) {
        for (const ref of refs) {
            await localDb.execute(`
                INSERT INTO reflections (id, content, mood, tags, date, user_id, synced)
                VALUES (?, ?, ?, ?, ?, ?, 1)
                ON CONFLICT(id) DO UPDATE SET
                    content = excluded.content,
                    mood = excluded.mood,
                    date = excluded.date,
                    synced = 1
            `, [ref.id, ref.content, ref.mood, ref.tags, ref.date, ref.user_id]);
        }
    },

    async saveReflectionLocally(ref: any, synced = 0) {
        await localDb.execute(`
            INSERT INTO reflections (id, content, mood, tags, date, user_id, synced)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [ref.id, ref.content, ref.mood, ref.tags, ref.date, ref.user_id, synced]);
    }
};
