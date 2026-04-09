import { localDb } from '@/lib/local-db';

export const LocalStudioService = {
    /**
     * Projects
     */
    async getProjects(userId?: string) {
        let sql = 'SELECT * FROM studio_projects';
        const params: any[] = [];
        if (userId) {
            sql += ' WHERE user_id = ?';
            params.push(userId);
        }
        return await localDb.query<any>(sql, params);
    },

    async syncProjects(projects: any[]) {
        for (const p of projects) {
            await localDb.execute(`
                INSERT INTO studio_projects (id, name, description, status, tags, user_id, synced)
                VALUES (?, ?, ?, ?, ?, ?, 1)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    status = excluded.status,
                    synced = 1
            `, [p.id, p.name, p.description, p.status, JSON.stringify(p.tags), p.user_id]);
        }
    },

    async saveProjectLocally(p: any, synced = 0) {
        await localDb.execute(`
            INSERT INTO studio_projects (id, name, description, status, tags, user_id, synced)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [p.id, p.name, p.description, p.status, JSON.stringify(p.tags), p.user_id, synced]);
    },

    /**
     * Maps (Canvas)
     */
    async getMaps(projectId?: string, userId?: string) {
        let sql = 'SELECT * FROM studio_maps';
        const params: any[] = [];
        const conditions: string[] = [];
        
        if (projectId) {
            conditions.push('project_id = ?');
            params.push(projectId);
        }
        if (userId) {
            conditions.push('user_id = ?');
            params.push(userId);
        }
        
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        return await localDb.query<any>(sql, params);
    },

    async syncMaps(maps: any[]) {
        for (const m of maps) {
            await localDb.execute(`
                INSERT INTO studio_maps (id, title, data, project_id, user_id, synced)
                VALUES (?, ?, ?, ?, ?, 1)
                ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    data = excluded.data,
                    synced = 1
            `, [m.id, m.title, typeof m.data === 'string' ? m.data : JSON.stringify(m.data), m.project_id, m.user_id]);
        }
    },

    async saveMapLocally(m: any, synced = 0) {
        await localDb.execute(`
            INSERT INTO studio_maps (id, title, data, project_id, user_id, synced)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [m.id, m.title, typeof m.data === 'string' ? m.data : JSON.stringify(m.data), m.project_id, m.user_id, synced]);
    },

    /**
     * Sparks
     */
    async getSparks(userId?: string) {
        let sql = 'SELECT * FROM studio_sparks';
        const params: any[] = [];
        if (userId) {
            sql += ' WHERE user_id = ?';
            params.push(userId);
        }
        return await localDb.query<any>(sql, params);
    },

    async syncSparks(sparks: any[]) {
        for (const s of sparks) {
            await localDb.execute(`
                INSERT INTO studio_sparks (id, content, user_id, synced)
                VALUES (?, ?, ?, 1)
                ON CONFLICT(id) DO UPDATE SET
                    content = excluded.content,
                    synced = 1
            `, [s.id, s.content, s.user_id]);
        }
    },

    /**
     * Milestones
     */
    async getMilestones(projectId?: string) {
        let sql = 'SELECT * FROM studio_milestones';
        const params: any[] = [];
        if (projectId) {
            sql += ' WHERE project_id = ?';
            params.push(projectId);
        }
        return await localDb.query<any>(sql, params);
    },

    async syncMilestones(milestones: any[]) {
        for (const m of milestones) {
            await localDb.execute(`
                INSERT INTO studio_milestones (id, project_id, title, impact_score, status, user_id, synced)
                VALUES (?, ?, ?, ?, ?, ?, 1)
                ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    status = excluded.status,
                    synced = 1
            `, [m.id, m.project_id, m.title, m.impact_score, m.status, m.user_id]);
        }
    },

    /**
     * Drafts
     */
    async getDrafts(userId?: string) {
        let sql = 'SELECT * FROM studio_drafts';
        const params: any[] = [];
        if (userId) {
            sql += ' WHERE user_id = ?';
            params.push(userId);
        }
        return await localDb.query<any>(sql, params);
    },

    async syncDrafts(drafts: any[]) {
        for (const d of drafts) {
            await localDb.execute(`
                INSERT INTO studio_drafts (id, title, content, status, is_archived, user_id, synced)
                VALUES (?, ?, ?, ?, ?, ?, 1)
                ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    content = excluded.content,
                    status = excluded.status,
                    is_archived = excluded.is_archived,
                    synced = 1
            `, [d.id, d.title, d.content, d.status, d.is_archived ? 1 : 0, d.user_id]);
        }
    },

    /**
     * Networks
     */
    async getNetworks(userId?: string) {
        let sql = 'SELECT * FROM studio_networks';
        const params: any[] = [];
        if (userId) {
            sql += ' WHERE user_id = ?';
            params.push(userId);
        }
        return await localDb.query<any>(sql, params);
    },

    async syncNetworks(networks: any[]) {
        for (const n of networks) {
            await localDb.execute(`
                INSERT INTO studio_networks (id, name, type, contact_info, user_id, synced)
                VALUES (?, ?, ?, ?, ?, 1)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    type = excluded.type,
                    contact_info = excluded.contact_info,
                    synced = 1
            `, [n.id, n.name, n.type, n.contact_info, n.user_id]);
        }
    },

    /**
     * Content
     */
    async getContent(userId?: string) {
        let sql = 'SELECT * FROM studio_content';
        const params: any[] = [];
        if (userId) {
            sql += ' WHERE user_id = ?';
            params.push(userId);
        }
        return await localDb.query<any>(sql, params);
    },

    async syncContent(content: any[]) {
        for (const c of content) {
            await localDb.execute(`
                INSERT INTO studio_content (id, title, category, status, user_id, synced)
                VALUES (?, ?, ?, ?, ?, 1)
                ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    category = excluded.category,
                    status = excluded.status,
                    synced = 1
            `, [c.id, c.title, c.category, c.status, c.user_id]);
        }
    },

    /**
     * Press
     */
    async getPress(userId?: string) {
        let sql = 'SELECT * FROM studio_press';
        const params: any[] = [];
        if (userId) {
            sql += ' WHERE user_id = ?';
            params.push(userId);
        }
        return await localDb.query<any>(sql, params);
    },

    async syncPress(press: any[]) {
        for (const p of press) {
            await localDb.execute(`
                INSERT INTO studio_press (id, title, organization, status, user_id, synced)
                VALUES (?, ?, ?, ?, ?, 1)
                ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    organization = excluded.organization,
                    status = excluded.status,
                    synced = 1
            `, [p.id, p.title, p.organization, p.status, p.user_id]);
        }
    }
};
