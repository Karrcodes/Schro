import { localDb } from '@/lib/local-db';

export const LocalFinanceService = {
    /**
     * Get all transactions from local DB
     */
    async getTransactions(userId?: string) {
        let sql = 'SELECT * FROM finances';
        const params: any[] = [];

        if (userId) {
            sql += ' WHERE user_id = ?';
            params.push(userId);
        }

        sql += ' ORDER BY date DESC';

        const rows = await localDb.query<any>(sql, params);
        
        return rows.map(row => ({
            ...row,
            is_recurring: !!row.is_recurring,
            is_fixed: !!row.is_fixed
        }));
    },

    /**
     * Sync transactions from Supabase to Local
     */
    async syncTransactions(transactions: any[]) {
        for (const tx of transactions) {
            await localDb.execute(`
                INSERT INTO finances (
                    id, amount, category, sub_category, vendor, description,
                    date, type, is_recurring, recurrence_rule, is_fixed,
                    payment_method, status, receipt_url, user_id, synced
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                ON CONFLICT(id) DO UPDATE SET
                    amount = excluded.amount,
                    category = excluded.category,
                    vendor = excluded.vendor,
                    date = excluded.date,
                    synced = 1
            `, [
                tx.id, tx.amount, tx.category, tx.sub_category, tx.vendor, tx.description,
                tx.date, tx.type, tx.is_recurring ? 1 : 0, tx.recurrence_rule, tx.is_fixed ? 1 : 0,
                tx.payment_method, tx.status, tx.receipt_url, tx.user_id
            ]);
        }
    },

    async saveTransactionLocally(tx: any, synced = 0) {
        await localDb.execute(`
            INSERT INTO finances (
                id, amount, category, sub_category, vendor, description,
                date, type, is_recurring, recurrence_rule, is_fixed,
                payment_method, status, receipt_url, user_id, synced
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            tx.id, tx.amount, tx.category, tx.sub_category, tx.vendor, tx.description,
            tx.date, tx.type, tx.is_recurring ? 1 : 0, tx.recurrence_rule, tx.is_fixed ? 1 : 0,
            tx.payment_method, tx.status, tx.receipt_url, tx.user_id, synced
        ]);
    },

    /**
     * Pockets (Savings Pots)
     */
    async getPockets(profile?: string) {
        let sql = 'SELECT * FROM pockets';
        const params: any[] = [];
        if (profile) {
            sql += ' WHERE profile = ?';
            params.push(profile);
        }
        sql += ' ORDER BY sort_order ASC';
        return await localDb.query<any>(sql, params);
    },

    async syncPockets(pockets: any[]) {
        for (const p of pockets) {
            await localDb.execute(`
                INSERT INTO pockets (id, name, balance, target_amount, profile, sort_order, user_id, synced)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    balance = excluded.balance,
                    target_amount = excluded.target_amount,
                    sort_order = excluded.sort_order,
                    synced = 1
            `, [p.id, p.name, p.balance, p.target_amount, p.profile, p.sort_order, p.user_id]);
        }
    }
};
