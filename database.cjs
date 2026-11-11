const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

function openDatabase({hosted, demo}) {
  const url = hosted ? process.env.TURSO_DATABASE_URL : '';
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (url) {
    if (!authToken || !/^(libsql|https):\/\//i.test(url)) throw new Error('Set a secure Turso URL and token.');
    const { createClient } = require('@libsql/client/web');
    const client = createClient({url,authToken});
    const bind = ({sql,args}) => ({sql,args:args.map(value=>Buffer.isBuffer(value) ? Uint8Array.from(value).buffer : value)});
    const execute = (sql,args) => client.execute(bind({sql,args}));
    return {
      async get(sql,...args) { return (await execute(sql,args)).rows[0]; },
      async all(sql,...args) { return (await execute(sql,args)).rows; },
      async run(sql,...args) {
        const result = await execute(sql,args);
        return {changes:result.rowsAffected,lastInsertRowid:result.lastInsertRowid};
      },
      batch(statements) { return client.batch(statements.map(bind),'write'); },
      close() { client.close(); }
    };
  }

  let filename = ':memory:';
  if (!hosted) {
    const directory = path.resolve(demo ? path.join(__dirname,'data','demo') : process.env.DATA_DIR || path.join(__dirname,'data'));
    fs.mkdirSync(directory,{recursive:true,mode:0o700});
    filename = path.join(directory,'site.sqlite');
  }
  const db = new DatabaseSync(filename);
  if (!hosted) db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  return {
    get(sql,...args) { return db.prepare(sql).get(...args); },
    all(sql,...args) { return db.prepare(sql).all(...args); },
    run(sql,...args) { return db.prepare(sql).run(...args); },
    batch(statements) {
      db.exec('BEGIN IMMEDIATE');
      try {
        for (const {sql,args} of statements) db.prepare(sql).run(...args);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    close() { db.close(); }
  };
}

module.exports = {openDatabase};
