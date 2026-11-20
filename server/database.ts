import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const file=resolve(process.env.SQLITE_PATH||'.data/playroom.sqlite');
mkdirSync(dirname(file),{recursive:true});
export const sqlite=new DatabaseSync(file);
sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
sqlite.exec('CREATE TABLE IF NOT EXISTS _schema_migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)');
for(const name of readdirSync(resolve('drizzle')).filter(n=>n.endsWith('.sql')).sort()) {
  if(sqlite.prepare('SELECT name FROM _schema_migrations WHERE name=?').get(name))continue;
  sqlite.exec('BEGIN IMMEDIATE');
  try{sqlite.exec(readFileSync(resolve('drizzle',name),'utf8'));sqlite.prepare('INSERT INTO _schema_migrations (name,applied_at) VALUES (?,?)').run(name,Date.now());sqlite.exec('COMMIT');}
  catch(error){sqlite.exec('ROLLBACK');throw error;}
}
sqlite.exec(`CREATE TABLE IF NOT EXISTS auth_users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS auth_sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS auth_sessions_user ON auth_sessions(user_id);
CREATE TABLE IF NOT EXISTS auth_limits (key TEXT PRIMARY KEY,attempts INTEGER NOT NULL,reset_at INTEGER NOT NULL);`);

class Statement {
  values:Array<string|number|null>=[];
  constructor(readonly sql:string){}
  bind(...values:Array<string|number|null>){const statement=new Statement(this.sql);statement.values=values;return statement;}
  async first<T>(column?:string):Promise<T|null>{const row=sqlite.prepare(this.sql).get(...this.values);return (column?row?.[column]:row??null) as T|null;}
  async all<T>(){return {results:sqlite.prepare(this.sql).all(...this.values) as T[],success:true,meta:{}};}
  runSync(){const result=sqlite.prepare(this.sql).run(...this.values);return {success:true,results:[],meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}};}
  async run(){return this.runSync();}
}
export const databaseAdapter={
  prepare(sql:string){return new Statement(sql);},
  async batch(statements:Statement[]){sqlite.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>s.runSync());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}},
};
