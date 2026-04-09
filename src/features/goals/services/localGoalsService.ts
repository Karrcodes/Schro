import { localDb } from '@/lib/local-db';

export const LocalGoalsService = {
    /**
     * Get all goals from local DB
     */
    async getGoals(userId?: string) {
        let sql = 'SELECT * FROM goals';
        const params: any[] = [];
        if (userId) {
            sql += ' WHERE user_id = ?';
            params.push(userId);
        }
        sql += ' ORDER BY priority DESC';
        return await localDb.query<any>(sql, params);
    },

    /**
     * Sync goals from Supabase to Local
     */
    async syncGoals(goals: any[]) {
        for (const goal of goals) {
            await localDb.execute(`
                INSERT INTO goals (id, title, description, status, priority, progress, deadline, user_id, synced)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
                ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    description = excluded.description,
                    status = excluded.status,
                    progress = excluded.progress,
                    priority = excluded.priority,
                    synced = 1
            `, [goal.id, goal.title, goal.description, goal.status, goal.priority, goal.progress, goal.deadline, goal.user_id]);
        }
    },

    async saveGoalLocally(goal: any, synced = 0) {
        await localDb.execute(`
            INSERT INTO goals (id, title, description, status, priority, progress, deadline, user_id, synced)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [goal.id, goal.title, goal.description, goal.status, goal.priority, goal.progress, goal.deadline, goal.user_id, synced]);
    }
};
