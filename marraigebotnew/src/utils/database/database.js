const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'marriage.db'));

// Enable performance optimizations
db.configure('busyTimeout', 5000); // Wait up to 5s for locks instead of failing immediately

// Initialize performance pragmas
db.serialize(() => {
    // WAL mode: better concurrency for reads during writes
    db.run('PRAGMA journal_mode = WAL');
    // Increase cache for faster lookups
    db.run('PRAGMA cache_size = -64000'); // 64MB cache
    // Synchronous mode: balance between safety and speed
    db.run('PRAGMA synchronous = NORMAL');
    // Temp store in memory for faster temp operations
    db.run('PRAGMA temp_store = MEMORY');
    // Foreign keys (good practice, minimal perf impact)
    db.run('PRAGMA foreign_keys = ON');
    // Query timeout
    db.run('PRAGMA query_only = OFF');
});

// Initialize database tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        userId TEXT PRIMARY KEY,
        gender TEXT DEFAULT NULL,
        married TEXT DEFAULT NULL,
        adoptedBy TEXT DEFAULT NULL,
        originalParent TEXT DEFAULT NULL,
        lastKiss INTEGER DEFAULT 0
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_married ON users(married)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_adoptedBy ON users(adoptedBy)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_userId ON users(userId)`);

    // Ensure gender column exists on older DBs
    db.all("PRAGMA table_info(users)", (err, rows) => {
        if (err) return;
        const hasGender = rows && rows.some(r => r.name === 'gender');
        if (!hasGender) {
            db.run(`ALTER TABLE users ADD COLUMN gender TEXT DEFAULT NULL`);
        }
    });

    // Family relationships table
    db.run(`CREATE TABLE IF NOT EXISTS family_relations (
        userId TEXT,
        relatedUserId TEXT,
        relationType TEXT,
        originalParent TEXT DEFAULT NULL,
        PRIMARY KEY (userId, relatedUserId)
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_family_userId ON family_relations(userId)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_family_relatedUserId ON family_relations(relatedUserId)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_family_relationType ON family_relations(relationType)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_family_composite ON family_relations(userId, relationType)`);
    
    // Ensure originalParent column exists on older DBs
    db.all("PRAGMA table_info(family_relations)", (err, rows) => {
        if (err) return;
        const hasOriginalParent = rows && rows.some(r => r.name === 'originalParent');
        if (!hasOriginalParent) {
            db.run(`ALTER TABLE family_relations ADD COLUMN originalParent TEXT DEFAULT NULL`);
        }
    });

    // Breed cooldown table (tracks when a couple last bred)
    db.run(`CREATE TABLE IF NOT EXISTS breed_cooldown (
        couple_key TEXT PRIMARY KEY,
        last_breed_time INTEGER
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_breed_cooldown_couple ON breed_cooldown(couple_key)`);
});

function addRelation(userId, relatedUserId, relationType, originalParent = null) {
    return new Promise((resolve, reject) => {
        db.run('INSERT OR REPLACE INTO family_relations (userId, relatedUserId, relationType, originalParent) VALUES (?, ?, ?, ?)',
            [userId, relatedUserId, relationType, originalParent],
            (err) => err ? reject(err) : resolve());
    });
}

function getRelations(userId) {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM family_relations WHERE userId = ? OR relatedUserId = ?',
            [userId, userId],
            (err, rows) => err ? reject(err) : resolve(rows));
    });
}

function areRelated(userId1, userId2) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM family_relations WHERE (userId = ? AND relatedUserId = ?) OR (userId = ? AND relatedUserId = ?)',
            [userId1, userId2, userId2, userId1],
            (err, row) => err ? reject(err) : resolve(row));
    });
}

function marry(userId1, userId2) {
    return new Promise((resolve, reject) => {
        // Execute as single statement instead of multiple runs for better performance
        db.serialize(() => {
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                db.run('UPDATE users SET married = ? WHERE userId = ?', [userId2, userId1], (err1) => {
                    if (err1) {
                        db.run('ROLLBACK', () => reject(err1));
                        return;
                    }
                    db.run('UPDATE users SET married = ? WHERE userId = ?', [userId1, userId2], (err2) => {
                        if (err2) {
                            db.run('ROLLBACK', () => reject(err2));
                            return;
                        }
                        db.run('COMMIT', (err3) => {
                            if (err3) reject(err3);
                            else resolve();
                        });
                    });
                });
            });
        });
    });
}

function divorce(userId1, userId2) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                db.run('UPDATE users SET married = NULL WHERE userId = ?', [userId1], (err1) => {
                    if (err1) {
                        db.run('ROLLBACK', () => reject(err1));
                        return;
                    }
                    db.run('UPDATE users SET married = NULL WHERE userId = ?', [userId2], (err2) => {
                        if (err2) {
                            db.run('ROLLBACK', () => reject(err2));
                            return;
                        }
                        db.run('COMMIT', (err3) => {
                            if (err3) reject(err3);
                            else resolve();
                        });
                    });
                });
            });
        });
    });
}

function adopt(parentId, childId) {
    return new Promise((resolve, reject) => {
        db.run('UPDATE users SET adoptedBy = ? WHERE userId = ?',
            [parentId, childId],
            (err) => err ? reject(err) : resolve());
    });
}

function disown(childId) {
    return new Promise((resolve, reject) => {
        db.run('UPDATE users SET adoptedBy = NULL WHERE userId = ?',
            [childId],
            (err) => err ? reject(err) : resolve());
    });
}

function getUserData(userId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE userId = ?',
            [userId],
            (err, row) => {
                if (err) reject(err);
                if (!row) {
                    db.run('INSERT INTO users (userId) VALUES (?)',
                        [userId],
                        (err) => err ? reject(err) : resolve({ userId, gender: null }));
                } else {
                    resolve(row);
                }
            });
    });
}

function setGender(userId, gender) {
    return new Promise((resolve, reject) => {
        // Upsert gender
        db.run('INSERT INTO users (userId, gender) VALUES (?, ?) ON CONFLICT(userId) DO UPDATE SET gender = excluded.gender',
            [userId, gender],
            (err) => err ? reject(err) : resolve());
    });
}

function getGrandparents(userId) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT DISTINCT fr2.relatedUserId AS grandparentId FROM family_relations fr
                INNER JOIN family_relations fr2 ON fr.relatedUserId = fr2.userId
                WHERE fr.userId = ? AND fr.relationType = 'parent' AND fr2.relationType = 'parent'`,
            [userId],
            (err, rows) => err ? reject(err) : resolve(rows ? rows.map(r => r.grandparentId) : []));
    });
}

function getGrandchildren(userId) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT DISTINCT fr2.relatedUserId AS grandchildId FROM family_relations fr
                INNER JOIN family_relations fr2 ON fr.relatedUserId = fr2.userId
                WHERE fr.userId = ? AND fr.relationType = 'child' AND fr2.relationType = 'child'`,
            [userId],
            (err, rows) => err ? reject(err) : resolve(rows ? rows.map(r => r.grandchildId) : []));
    });
}

function getUnclesAunts(userId) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT DISTINCT fr2.relatedUserId AS uncleAuntId FROM family_relations fr
                INNER JOIN family_relations fr2 ON fr.relatedUserId = fr2.userId
                WHERE fr.userId = ? AND fr.relationType = 'parent' AND fr2.relationType = 'sibling'`,
            [userId],
            (err, rows) => err ? reject(err) : resolve(rows ? rows.map(r => r.uncleAuntId) : []));
    });
}

function getNephewsNieces(userId) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT DISTINCT fr2.relatedUserId AS nephewNieceId FROM family_relations fr
                INNER JOIN family_relations fr2 ON fr.relatedUserId = fr2.userId
                WHERE fr.userId = ? AND fr.relationType = 'sibling' AND fr2.relationType = 'child'`,
            [userId],
            (err, rows) => err ? reject(err) : resolve(rows ? rows.map(r => r.nephewNieceId) : []));
    });
}

function getLeaderboardStats() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT userId, COUNT(*) as marriages FROM users WHERE married IS NOT NULL GROUP BY userId ORDER BY marriages DESC LIMIT 10`,
            [],
            (err, rows) => {
                if (err) return reject(err);
                let stats = rows.map((row, i) => `#${i+1}: <@${row.userId}> - ${row.marriages} marriages`).join('\n');
                resolve(stats);
            });
    });
}

function canBreed(userId1, userId2, cooldownDays = 9) {
    return new Promise((resolve, reject) => {
        // Couple key (normalized so order doesn't matter)
        const key = [userId1, userId2].sort().join('|');
        db.get('SELECT last_breed_time FROM breed_cooldown WHERE couple_key = ?',
            [key],
            (err, row) => {
                if (err) return reject(err);
                if (!row) return resolve(true); // never bred
                const now = Date.now();
                const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
                const canBreedNow = now - row.last_breed_time >= cooldownMs;
                resolve(canBreedNow);
            });
    });
}

function recordBreed(userId1, userId2) {
    return new Promise((resolve, reject) => {
        const key = [userId1, userId2].sort().join('|');
        db.run('INSERT INTO breed_cooldown (couple_key, last_breed_time) VALUES (?, ?) ON CONFLICT(couple_key) DO UPDATE SET last_breed_time = excluded.last_breed_time',
            [key, Date.now()],
            (err) => err ? reject(err) : resolve());
    });
}

function getNextBreedTime(userId1, userId2, cooldownDays = 9) {
    return new Promise((resolve, reject) => {
        const key = [userId1, userId2].sort().join('|');
        db.get('SELECT last_breed_time FROM breed_cooldown WHERE couple_key = ?',
            [key],
            (err, row) => {
                if (err) return reject(err);
                if (!row) return resolve(null);
                const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
                const nextTime = row.last_breed_time + cooldownMs;
                resolve(nextTime);
            });
    });
}

module.exports = {
    addRelation,
    getRelations,
    areRelated,
    marry,
    divorce,
    adopt,
    disown,
    getUserData,
    getGrandparents,
    getGrandchildren,
    getUnclesAunts,
    getNephewsNieces,
    getLeaderboardStats,
    setGender,
    canBreed,
    recordBreed,
    getNextBreedTime
};