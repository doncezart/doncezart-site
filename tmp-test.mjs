
import fs from 'fs';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
const db = drizzle(postgres('postgresql://doncezart:doncezart@192.168.100.14:5435/doncezart'));
const id = '9b0c0ea9eb1b4d4f32b017fb3137af8891737074f72a4b8a348ee58a43ae3d09';
try {
  const rows = await db.select().from(sql`session`).innerJoin(sql`"user"`, sql`session.user_id = "user".id`).where(sql`session.id = ${id}`).limit(1);
  console.log(JSON.stringify(rows));
} catch (err) {
  console.error(err);
  process.exit(1);
} finally {
  await db.end();
}
