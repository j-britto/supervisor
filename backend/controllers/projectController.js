import { getLocalDatabase, saveLocalDatabase } from '../helpers/dbHelper.js';
import { Project } from '../models/Project.js';

export const getProjects = async (req, res) => {
  const projects = await Project.find();
  res.json(projects);
};

export const createProject = async (req, res) => {
  const db = getLocalDatabase();
  const rawBatch = req.body.batch_number;
  const batchStr = String(rawBatch !== undefined ? rawBatch : 35).trim();
  const batchNum = parseInt(rawBatch, 10) || rawBatch || 35;
  const projTitle = (req.body.project_title || '').trim();

  // Rule 2.1: Check whether the entered batch number already exists
  const existingBatchProj = db.projects.find(p =>
    String(p.batch_number).trim().toLowerCase() === batchStr.toLowerCase()
  );

  if (existingBatchProj) {
    return res.status(400).json({
      error: `Batch number ${rawBatch} already exists. Please use a unique batch number.`
    });
  }

  // Duplicate check for project_title
  if (projTitle) {
    const dupTitle = db.projects.find(p => p.project_title.trim().toLowerCase() === projTitle.toLowerCase());
    if (dupTitle) {
      return res.status(400).json({
        error: `Duplicate error: A project with title "${projTitle}" already exists. Duplicate project titles are not allowed.`
      });
    }
  }

  const newProject = {
    id: 'p_' + Date.now(),
    project_title: projTitle,
    description: req.body.description || '',
    objective: req.body.objective || '',
    tech_stack: req.body.tech_stack || '',
    external_event_submitted: Boolean(req.body.external_event_submitted),
    accepted_project: Boolean(req.body.accepted_project),
    external_demo_or_paper: Boolean(req.body.external_demo_or_paper),
    published: Boolean(req.body.published),
    patent_granted: Boolean(req.body.patent_granted),
    batch_number: batchNum,
    mentor_roll_number: req.body.mentor_roll_number || 'MNT-401',
    student1_register_number: parseInt(req.body.student1_register_number, 10) || 0,
    student2_register_number: parseInt(req.body.student2_register_number, 10) || 0,
    project_status: req.body.project_status || 'In Progress',
    publication_status: req.body.publication_status || 'Submitted'
  };

  db.projects.push(newProject);

  // Update project_title in reviews for assigned students
  db.reviews.forEach(r => {
    if (r.student_register_number === newProject.student1_register_number || r.student_register_number === newProject.student2_register_number) {
      r.project_title = newProject.project_title;
      r.project_status = newProject.project_status;
      r.batch_number = newProject.batch_number;
    }
  });

  saveLocalDatabase(db);
  res.json({ success: true, project: newProject });
};

export const updateProject = (req, res) => {
  const { id } = req.params;
  const db = getLocalDatabase();
  const idx = db.projects.findIndex(p => p.id === id);

  if (idx !== -1) {
    if (req.body.batch_number !== undefined) {
      const rawBatch = req.body.batch_number;
      const batchStr = String(rawBatch).trim();
      const existingBatchProj = db.projects.find(p =>
        p.id !== id && String(p.batch_number).trim().toLowerCase() === batchStr.toLowerCase()
      );
      if (existingBatchProj) {
        return res.status(400).json({
          error: `Batch number ${rawBatch} already exists. Please use a unique batch number.`
        });
      }
    }

    if (req.body.project_title) {
      const updatedTitle = req.body.project_title.trim();
      const dupTitle = db.projects.find(p => p.id !== id && p.project_title.trim().toLowerCase() === updatedTitle.toLowerCase());
      if (dupTitle) {
        return res.status(400).json({
          error: `Duplicate error: A project with title "${updatedTitle}" already exists. Duplicate project titles are not allowed.`
        });
      }
    }

    db.projects[idx] = { ...db.projects[idx], ...req.body };
    const p = db.projects[idx];

    // Sync project title & status in reviews
    db.reviews.forEach(r => {
      if (r.student_register_number === p.student1_register_number || r.student_register_number === p.student2_register_number) {
        r.project_title = p.project_title;
        r.project_status = p.project_status;
        r.batch_number = p.batch_number;
      }
    });

    saveLocalDatabase(db);
    return res.json({ success: true, project: p });
  }

  res.status(404).json({ error: 'Project not found' });
};

export const deleteProject = (req, res) => {
  const { id } = req.params;
  const db = getLocalDatabase();
  db.projects = db.projects.filter(p => p.id !== id);
  saveLocalDatabase(db);
  res.json({ success: true, message: 'Project deleted' });
};

export default {
  getProjects,
  createProject,
  updateProject,
  deleteProject
};
