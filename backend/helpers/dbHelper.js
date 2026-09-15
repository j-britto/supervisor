import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, '..', '..', 'psms_database.json');

/**
 * Load local database JSON with recovery fallback
 */
export function getLocalDatabase() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      console.error('[DB Helper] Error reading database file:', e.message);
    }
  }
  return null;
}

/**
 * Save local database JSON safely
 */
export function saveLocalDatabase(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('[DB Helper] Error saving database file:', e.message);
    return false;
  }
}

/**
 * Build SQL Parameterized Insert
 */
export function buildInsertSQL(tableName, dataObject) {
  const keys = Object.keys(dataObject);
  const columns = keys.map(k => k.toUpperCase()).join(', ');
  const placeholders = keys.map(k => `:${k}`).join(', ');
  return {
    sql: `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`,
    binds: dataObject
  };
}

/**
 * Build SQL Parameterized Update
 */
export function buildUpdateSQL(tableName, dataObject, idColumn = 'ID', idValue) {
  const keys = Object.keys(dataObject).filter(k => k.toUpperCase() !== idColumn.toUpperCase());
  const setClauses = keys.map(k => `${k.toUpperCase()} = :${k}`).join(', ');
  return {
    sql: `UPDATE ${tableName} SET ${setClauses} WHERE ${idColumn} = :idVal`,
    binds: { ...dataObject, idVal: idValue }
  };
}

export default {
  getLocalDatabase,
  saveLocalDatabase,
  buildInsertSQL,
  buildUpdateSQL
};
