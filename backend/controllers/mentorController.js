import { getLocalDatabase, saveLocalDatabase } from '../helpers/dbHelper.js';
import { Mentor } from '../models/Mentor.js';

export const getMentors = async (req, res) => {
  const mentors = await Mentor.find();
  res.json(mentors);
};

export const createMentor = (req, res) => {
  const db = getLocalDatabase();
  const newMentor = {
    id: 'm_' + Date.now(),
    ...req.body,
    status: req.body.status || 'Active'
  };
  db.mentors.push(newMentor);
  saveLocalDatabase(db);
  res.json({ success: true, mentor: newMentor });
};

export const updateMentor = (req, res) => {
  const { id } = req.params;
  const db = getLocalDatabase();
  const idx = db.mentors.findIndex(m => m.id === id);
  if (idx !== -1) {
    db.mentors[idx] = { ...db.mentors[idx], ...req.body };
    saveLocalDatabase(db);
    return res.json({ success: true, mentor: db.mentors[idx] });
  }
  res.status(404).json({ error: 'Mentor not found' });
};

export const deleteMentor = (req, res) => {
  const { id } = req.params;
  const db = getLocalDatabase();
  db.mentors = db.mentors.filter(m => m.id !== id);
  saveLocalDatabase(db);
  res.json({ success: true, message: 'Mentor deleted' });
};

export const removeAllMentors = (req, res) => {
  const db = getLocalDatabase();
  db.mentors = [];
  saveLocalDatabase(db);
  res.json({ success: true, message: 'All supervisor data removed successfully' });
};

export default {
  getMentors,
  createMentor,
  updateMentor,
  deleteMentor,
  removeAllMentors
};
