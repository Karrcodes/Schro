import { localDb } from '@/lib/local-db';
import type { Task } from '../types/tasks.types';

export const LocalTasksService = {
    /**
     * Get tasks for a category and profile from local DB
     */
    async getTasks(category: string, userId?: string): Promise<Task[]> {
        let sql = 'SELECT * FROM tasks WHERE category = ?';
        const params: any[] = [category];

        if (userId) {
            sql += ' AND user_id = ?';
            params.push(userId);
        }

        sql += ' ORDER BY position DESC';

        const rows = await localDb.query<any>(sql, params);
        
        return rows.map(row => ({
            ...row,
            is_completed: !!row.is_completed // Convert 0/1 to boolean
        }));
    },

    /**
     * Upsert tasks from Supabase into local DB to keeps things in sync
     */
    async syncTasks(tasks: Task[]) {
        for (const task of tasks) {
            await localDb.execute(`
                INSERT INTO tasks (
                    id, title, priority, due_date, due_date_mode, end_date, 
                    recurrence_config, amount, notes, strategic_category, 
                    estimated_duration, impact_score, travel_to_duration, 
                    travel_from_duration, start_time, location, origin_location, 
                    is_completed, category, profile, user_id, created_at, position, synced
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    priority = excluded.priority,
                    due_date = excluded.due_date,
                    is_completed = excluded.is_completed,
                    position = excluded.position,
                    synced = 1
            `, [
                task.id, task.title, task.priority, task.due_date, task.due_date_mode, task.end_date,
                JSON.stringify(task.recurrence_config), task.amount, task.notes, task.strategic_category,
                task.estimated_duration, task.impact_score, task.travel_to_duration,
                task.travel_from_duration, task.start_time, task.location, task.origin_location,
                task.is_completed ? 1 : 0, task.category, task.profile, task.user_id, 
                task.created_at, task.position
            ]);
        }
    },

    /**
     * Quick save a single task locally
     */
    async saveTaskLocally(task: Task, synced = 0) {
        await localDb.execute(`
             INSERT INTO tasks (
                    id, title, priority, due_date, due_date_mode, end_date, 
                    recurrence_config, amount, notes, strategic_category, 
                    estimated_duration, impact_score, travel_to_duration, 
                    travel_from_duration, start_time, location, origin_location, 
                    is_completed, category, profile, user_id, created_at, position, synced
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            task.id, task.title, task.priority, task.due_date, task.due_date_mode, task.end_date,
            JSON.stringify(task.recurrence_config), task.amount, task.notes, task.strategic_category,
            task.estimated_duration, task.impact_score, task.travel_to_duration,
            task.travel_from_duration, task.start_time, task.location, task.origin_location,
            task.is_completed ? 1 : 0, task.category, task.profile, task.user_id, 
            task.created_at, task.position, synced
        ]);
    },

    async deleteTaskLocally(id: string) {
        await localDb.execute('DELETE FROM tasks WHERE id = ?', [id]);
    }
};
