import { executeSQL, getOracleStatus } from '../config/oracle.js';
import { getLocalDatabase, saveLocalDatabase } from '../helpers/dbHelper.js';

export class OracleModel {
  constructor(tableName, collectionName) {
    this.tableName = tableName;
    this.collectionName = collectionName;
  }

  async find(filterFn = null) {
    const status = getOracleStatus();
    if (status.connected) {
      const res = await executeSQL(`SELECT * FROM ${this.tableName}`);
      if (res.success && res.data) {
        return filterFn ? res.data.filter(filterFn) : res.data;
      }
    }

    // Fallback to local store
    const db = getLocalDatabase() || {};
    const items = db[this.collectionName] || [];
    return filterFn ? items.filter(filterFn) : items;
  }

  async findOne(filterFn) {
    const items = await this.find(filterFn);
    return items.length > 0 ? items[0] : null;
  }

  async create(record) {
    const status = getOracleStatus();
    if (status.connected) {
      // Build parameterized Oracle SQL
      const keys = Object.keys(record);
      const cols = keys.map(k => k.toUpperCase()).join(', ');
      const placeholders = keys.map(k => `:${k}`).join(', ');
      await executeSQL(`INSERT INTO ${this.tableName} (${cols}) VALUES (${placeholders})`, record);
    }

    // Always maintain local persistent fallback
    const db = getLocalDatabase() || {};
    if (!db[this.collectionName]) db[this.collectionName] = [];
    db[this.collectionName].push(record);
    saveLocalDatabase(db);
    return record;
  }

  async update(id, updates) {
    const status = getOracleStatus();
    if (status.connected) {
      const keys = Object.keys(updates);
      const setClauses = keys.map(k => `${k.toUpperCase()} = :${k}`).join(', ');
      await executeSQL(`UPDATE ${this.tableName} SET ${setClauses} WHERE ID = :id`, { ...updates, id });
    }

    const db = getLocalDatabase() || {};
    const items = db[this.collectionName] || [];
    const idx = items.findIndex(item => item.id === id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...updates };
      saveLocalDatabase(db);
      return items[idx];
    }
    return null;
  }

  async delete(id) {
    const status = getOracleStatus();
    if (status.connected) {
      await executeSQL(`DELETE FROM ${this.tableName} WHERE ID = :id`, { id });
    }

    const db = getLocalDatabase() || {};
    if (db[this.collectionName]) {
      db[this.collectionName] = db[this.collectionName].filter(item => item.id !== id);
      saveLocalDatabase(db);
      return true;
    }
    return false;
  }
}

export default OracleModel;
