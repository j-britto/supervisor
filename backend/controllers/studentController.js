import { getLocalDatabase, saveLocalDatabase } from '../helpers/dbHelper.js';
import { Student } from '../models/Student.js';

export const getStudents = async (req, res) => {
  const students = await Student.find();
  res.json(students);
};

export const createStudent = async (req, res) => {
  const db = getLocalDatabase();
  const name = (req.body.name || '').trim();
  const rollNo = (req.body.roll_number || '').trim();
  const regNo = parseInt(req.body.register_number, 10);
  const phone = (req.body.phone || '').trim();
  const email = (req.body.email || '').trim();
  const batchNum = parseInt(req.body.batch_number, 10) || 35;

  if (!name || !rollNo || !regNo || !phone || !email) {
    return res.status(400).json({ error: 'All fields (Name, Roll No, Register No, Phone, Email) are required.' });
  }

  // Duplicate checks
  const dupReg = db.students.find(s => String(s.register_number).trim() === String(regNo).trim());
  if (dupReg) {
    return res.status(400).json({ error: 'A student with this registration number already exists.' });
  }

  const dupName = db.students.find(s => s.name.trim().toLowerCase() === name.toLowerCase());
  if (dupName) {
    return res.status(400).json({ error: `Duplicate error: A student with the name "${name}" already exists.` });
  }

  const dupRoll = db.students.find(s => s.roll_number.trim().toLowerCase() === rollNo.toLowerCase());
  if (dupRoll) {
    return res.status(400).json({ error: `Duplicate error: Student with Roll Number "${rollNo}" already exists.` });
  }

  const dupEmail = db.students.find(s => s.email.trim().toLowerCase() === email.toLowerCase());
  if (dupEmail) {
    return res.status(400).json({ error: `Duplicate error: Student with Email ID "${email}" already exists.` });
  }

  const dupPhone = db.students.find(s => String(s.phone).trim() === phone);
  if (dupPhone) {
    return res.status(400).json({ error: `Duplicate error: Student with Phone Number "${phone}" already exists.` });
  }

  // Constraint: Only 2 students allowed per batch
  const batchStudents = db.students.filter(s => Number(s.batch_number) === Number(batchNum));
  if (batchStudents.length >= 2) {
    return res.status(400).json({
      error: `Batch capacity limit: Batch ${batchNum} already has 2 students (Student 1 and Student 2). Each batch is strictly limited to 2 students.`
    });
  }

  const teammateInput = (req.body.teammate_name || req.body.team_mate_name || '').trim();
  const sectionVal = (req.body.section || req.body.class || 'A').trim();
  const yearVal = (req.body.year || '4th Year').trim();
  const deptVal = (req.body.department || 'CSE').trim();
  const mentorVal = (req.body.mentor_roll_number || 'MNT-401').trim();

  const newStudent = {
    id: 's_' + Date.now(),
    name,
    roll_number: rollNo,
    register_number: regNo,
    phone,
    class: sectionVal,
    section: sectionVal,
    year: yearVal,
    department: deptVal,
    email,
    photo: '',
    mentor_roll_number: mentorVal,
    team_number: batchNum,
    team_name: req.body.team_name || `Batch ${batchNum} Team`,
    batch_number: batchNum,
    teammate_name: teammateInput
  };

  // Connect with batch mate if another student is in the same batch
  if (batchStudents.length === 1) {
    const batchMate = batchStudents[0];
    if (!newStudent.teammate_name) {
      newStudent.teammate_name = batchMate.name;
    }
    if (!batchMate.teammate_name) {
      batchMate.teammate_name = newStudent.name;
    }
  }

  // Also if teammate_name is provided and matches an existing student, link both
  if (newStudent.teammate_name) {
    const mate = db.students.find(s => s.name.trim().toLowerCase() === newStudent.teammate_name.toLowerCase());
    if (mate && !mate.teammate_name) {
      mate.teammate_name = newStudent.name;
    }
  }

  db.students.push(newStudent);

  // Synchronize or create project record for this batch
  let project = db.projects.find(p => Number(p.batch_number) === Number(batchNum));
  if (project) {
    if (!project.student1_register_number) {
      project.student1_register_number = regNo;
    } else if (!project.student2_register_number && Number(project.student1_register_number) !== Number(regNo)) {
      project.student2_register_number = regNo;
    }
    newStudent.project_title = project.project_title;
    newStudent.team_name = project.team_name || newStudent.team_name;
  } else {
    project = {
      id: 'p_' + Date.now(),
      project_title: req.body.project_title || `${newStudent.name}'s Project`,
      description: 'Academic final year capstone project.',
      objective: 'Design and implementation of engineering solution.',
      tech_stack: 'Full Stack Web & AI',
      external_event_submitted: false,
      accepted_project: false,
      external_demo_or_paper: false,
      published: false,
      patent_granted: false,
      batch_number: batchNum,
      mentor_roll_number: newStudent.mentor_roll_number,
      student1_register_number: regNo,
      student2_register_number: null,
      project_status: 'In Progress',
      publication_status: 'Not Submitted'
    };
    db.projects.push(project);
    newStudent.project_title = project.project_title;
  }

  // Synchronize or create team record for this batch
  if (!db.teams) db.teams = [];
  let team = db.teams.find(t => Number(t.team_batch) === Number(batchNum));
  if (team) {
    if (!team.student1_register_number) {
      team.student1_register_number = regNo;
    } else if (!team.student2_register_number && Number(team.student1_register_number) !== Number(regNo)) {
      team.student2_register_number = regNo;
    }
  } else {
    db.teams.push({
      id: 't_' + Date.now(),
      team_batch: batchNum,
      team_name: newStudent.team_name,
      student1_register_number: regNo,
      student2_register_number: null,
      project_title: project.project_title,
      mentor_roll_number: newStudent.mentor_roll_number
    });
  }

  // Initialize reviews 1-6 for the student if not already present
  for (let i = 1; i <= 6; i++) {
    const existingRev = db.reviews.find(r => Number(r.student_register_number) === Number(regNo) && Number(r.review_number) === i);
    if (!existingRev) {
      db.reviews.push({
        id: `r_${Date.now()}_${i}`,
        review_number: i,
        batch_number: newStudent.batch_number,
        student_register_number: newStudent.register_number,
        project_title: project?.project_title || 'Unassigned Project',
        project_status: 'In Progress',
        review_status: 'Pending',
        mark: 0,
        max_mark: 10,
        completed: false,
        date: '',
        comments: ''
      });
    }
  }

  saveLocalDatabase(db);
  res.json({ success: true, student: newStudent });
};

export const updateStudent = (req, res) => {
  const { id } = req.params;
  const db = getLocalDatabase();
  const idx = db.students.findIndex(s => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Student not found' });
  }

  const current = db.students[idx];

  // If changing name
  if (req.body.name && req.body.name.trim().toLowerCase() !== current.name.trim().toLowerCase()) {
    const dupName = db.students.find(s => s.id !== id && s.name.trim().toLowerCase() === req.body.name.trim().toLowerCase());
    if (dupName) return res.status(400).json({ error: `Duplicate error: Student with name "${req.body.name}" already exists.` });
  }

  // If changing register_number
  if (req.body.register_number !== undefined && parseInt(req.body.register_number, 10) !== current.register_number) {
    const newReg = parseInt(req.body.register_number, 10);
    const dupReg = db.students.find(s => s.id !== id && s.register_number === newReg);
    if (dupReg) return res.status(400).json({ error: `Duplicate error: Student with Registration Number "${newReg}" already exists.` });
  }

  // If changing roll_number
  if (req.body.roll_number && req.body.roll_number.trim().toLowerCase() !== current.roll_number.trim().toLowerCase()) {
    const dupRoll = db.students.find(s => s.id !== id && s.roll_number.trim().toLowerCase() === req.body.roll_number.trim().toLowerCase());
    if (dupRoll) return res.status(400).json({ error: `Duplicate error: Student with Roll Number "${req.body.roll_number}" already exists.` });
  }

  // If changing email
  if (req.body.email && req.body.email.trim().toLowerCase() !== current.email.trim().toLowerCase()) {
    const dupEmail = db.students.find(s => s.id !== id && s.email.trim().toLowerCase() === req.body.email.trim().toLowerCase());
    if (dupEmail) return res.status(400).json({ error: `Duplicate error: Student with Email "${req.body.email}" already exists.` });
  }

  // If changing phone
  if (req.body.phone && String(req.body.phone).trim() !== String(current.phone).trim()) {
    const dupPhone = db.students.find(s => s.id !== id && String(s.phone).trim() === String(req.body.phone).trim());
    if (dupPhone) return res.status(400).json({ error: `Duplicate error: Student with Phone "${req.body.phone}" already exists.` });
  }

  // If changing batch_number
  if (req.body.batch_number !== undefined && parseInt(req.body.batch_number, 10) !== current.batch_number) {
    const newBatch = parseInt(req.body.batch_number, 10);
    const batchStudents = db.students.filter(s => s.id !== id && s.batch_number === newBatch);
    if (batchStudents.length >= 2) {
      return res.status(400).json({ error: `Batch capacity limit: Batch ${newBatch} already has 2 students. Each batch is limited to 2 students.` });
    }
  }

  db.students[idx] = { ...db.students[idx], ...req.body };
  saveLocalDatabase(db);
  return res.json({ success: true, student: db.students[idx] });
};

export const deleteStudent = (req, res) => {
  const { id } = req.params;
  const db = getLocalDatabase();
  const student = db.students.find(s => s.id === id);
  if (student) {
    db.reviews = db.reviews.filter(r => r.student_register_number !== student.register_number);
  }
  db.students = db.students.filter(s => s.id !== id);
  saveLocalDatabase(db);
  res.json({ success: true, message: 'Student deleted' });
};

export default {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent
};
