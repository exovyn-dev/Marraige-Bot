const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'marriage.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Failed to open DB:', err.message);
    process.exit(1);
  }
});

function q(sql) {
  return new Promise((res, rej) => db.get(sql, (err, row) => err ? rej(err) : res(row)));
}

(async () => {
  try {
    const users = await q(`SELECT COUNT(*) as c FROM users`);
    const relations = await q(`SELECT COUNT(*) as c FROM family_relations`);
    console.log(`Users: ${users.c}`);
    console.log(`Family relations: ${relations.c}`);
  } catch (err) {
    console.error('Query error:', err);
  } finally {
    db.close();
  }
})();
