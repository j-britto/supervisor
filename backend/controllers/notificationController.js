import { getLocalDatabase, saveLocalDatabase } from '../helpers/dbHelper.js';

export const getNotifications = (req, res) => {
  const db = getLocalDatabase();
  res.json(db.notifications || []);
};

export const markAllRead = (req, res) => {
  const db = getLocalDatabase();
  if (db.notifications) {
    db.notifications.forEach(n => n.read = true);
    saveLocalDatabase(db);
  }
  res.json({ success: true });
};

export default {
  getNotifications,
  markAllRead
};
