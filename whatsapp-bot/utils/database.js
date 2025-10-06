const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, '..', 'bot.db'));
        this.init();
    }

    init() {
        const sql = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT UNIQUE NOT NULL,
                name TEXT,
                group_id TEXT,
                last_message_date DATE,
                total_fine INTEGER DEFAULT 0,
                is_admin BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS fines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_phone TEXT,
                group_id TEXT,
                fine_date DATE,
                amount INTEGER,
                reason TEXT,
                paid BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_phone) REFERENCES users (phone)
            );

            CREATE TABLE IF NOT EXISTS groups (
                id TEXT PRIMARY KEY,
                name TEXT,
                bot_is_admin BOOLEAN DEFAULT 0,
                active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS daily_activity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_phone TEXT,
                group_id TEXT,
                activity_date DATE,
                message_count INTEGER DEFAULT 0,
                UNIQUE(user_phone, group_id, activity_date),
                FOREIGN KEY (user_phone) REFERENCES users (phone)
            );
        `;

        this.db.exec(sql, (err) => {
            if (err) {
                console.error('Database initialization error:', err);
            } else {
                console.log('Database initialized successfully');
            }
        });
    }

    // User management
    addUser(phone, name, groupId, isAdmin = false) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT OR REPLACE INTO users (phone, name, group_id, last_message_date, is_admin) 
                        VALUES (?, ?, ?, DATE('now'), ?)`;
            this.db.run(sql, [phone, name, groupId, isAdmin], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    updateUserActivity(phone, groupId) {
        return new Promise((resolve, reject) => {
            // Update user's last message date
            const updateUserSql = `UPDATE users SET last_message_date = DATE('now') WHERE phone = ? AND group_id = ?`;
            this.db.run(updateUserSql, [phone, groupId], (err) => {
                if (err) reject(err);
                else {
                    // Update daily activity
                    const activitySql = `INSERT OR REPLACE INTO daily_activity (user_phone, group_id, activity_date, message_count)
                                        VALUES (?, ?, DATE('now'), COALESCE((SELECT message_count FROM daily_activity 
                                        WHERE user_phone = ? AND group_id = ? AND activity_date = DATE('now')), 0) + 1)`;
                    this.db.run(activitySql, [phone, groupId, phone, groupId], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                }
            });
        });
    }

    // Fine management
    addFine(userPhone, groupId, amount, reason) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO fines (user_phone, group_id, fine_date, amount, reason) 
                        VALUES (?, ?, DATE('now'), ?, ?)`;
            this.db.run(sql, [userPhone, groupId, amount, reason], function(err) {
                if (err) reject(err);
                else {
                    // Update user's total fine
                    const updateSql = `UPDATE users SET total_fine = total_fine + ? WHERE phone = ?`;
                    this.db.run(updateSql, [amount, userPhone], (updateErr) => {
                        if (updateErr) reject(updateErr);
                        else resolve(this.lastID);
                    });
                }
            });
        });
    }

    getInactiveUsers(groupId, days = 1) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT phone, name, last_message_date, total_fine 
                        FROM users 
                        WHERE group_id = ? 
                        AND (last_message_date IS NULL OR last_message_date < DATE('now', '-${days} day'))
                        AND is_admin = 0`;
            this.db.all(sql, [groupId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getUserFines(userPhone, groupId) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM fines WHERE user_phone = ? AND group_id = ? ORDER BY created_at DESC`;
            this.db.all(sql, [userPhone, groupId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getAllFines(groupId) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT u.name, u.phone, u.total_fine, COUNT(f.id) as fine_count 
                        FROM users u 
                        LEFT JOIN fines f ON u.phone = f.user_phone AND f.group_id = ?
                        WHERE u.group_id = ? 
                        GROUP BY u.phone, u.name, u.total_fine 
                        ORDER BY u.total_fine DESC`;
            this.db.all(sql, [groupId, groupId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Group management
    addGroup(groupId, name, botIsAdmin = false) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT OR REPLACE INTO groups (id, name, bot_is_admin) VALUES (?, ?, ?)`;
            this.db.run(sql, [groupId, name, botIsAdmin], function(err) {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    updateBotAdminStatus(groupId, isAdmin) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE groups SET bot_is_admin = ? WHERE id = ?`;
            this.db.run(sql, [isAdmin, groupId], function(err) {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    getBotAdminStatus(groupId) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT bot_is_admin FROM groups WHERE id = ?`;
            this.db.get(sql, [groupId], (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.bot_is_admin : false);
            });
        });
    }

    close() {
        this.db.close();
    }
}

module.exports = Database;

// Initialize database if running directly
if (require.main === module) {
    const db = new Database();
    console.log('Database setup complete!');
    setTimeout(() => db.close(), 1000);
}
