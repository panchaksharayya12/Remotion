import { getDb } from './db.js';

async function clean() {
  const db = await getDb();
  db.run("UPDATE messages SET message_text = REPLACE(message_text, 'Kavya', 'Asha'), translated_text = REPLACE(translated_text, 'काव्या', 'आशा')");
  db.run("UPDATE users SET name = 'Asha Sharma', avatar = 'AS' WHERE name LIKE '%Kavya%'");
  console.log('Database cleaned successfully of any legacy names.');
}

clean();
