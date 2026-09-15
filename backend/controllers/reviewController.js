import { getLocalDatabase, saveLocalDatabase } from '../helpers/dbHelper.js';
import { sendEmail } from '../services/emailService.js';
import { emailQueue } from '../queues/emailQueue.js';

export function triggerNotification(student, reviewNumber, reviewStatus, mark) {
  const db = getLocalDatabase();
  const mentor = db.mentors.find(m => m.mentor_roll_number === student.mentor_roll_number);
  const project = db.projects.find(p => p.student1_register_number === student.register_number || p.student2_register_number === student.register_number);
  
  const studentReviews = db.reviews.filter(r => r.student_register_number === student.register_number);
  const completedCount = studentReviews.filter(r => r.review_status === 'Completed').length;
  const completionPercentage = ((completedCount / 6) * 100).toFixed(1);

  const activeStudentTpl = db.messageTemplates.find(t => t.type === 'student' && t.active);
  const activeMentorTpl = db.messageTemplates.find(t => t.type === 'mentor' && t.active);

  const todayStr = new Date().toISOString().split('T')[0];

  let studentMsgText = `Review ${reviewNumber} status for ${student.name}: ${reviewStatus}`;
  let mentorMsgText = `Batch ${student.batch_number} Student ${student.name} completed Review ${reviewNumber}.`;

  if (activeStudentTpl) {
    studentMsgText = activeStudentTpl.template
      .replace(/{{studentName}}/g, student.name)
      .replace(/{{reviewNumber}}/g, reviewNumber)
      .replace(/{{reviewStatus}}/g, reviewStatus)
      .replace(/{{projectTitle}}/g, project ? project.project_title : 'Final Year Project')
      .replace(/{{supervisorName}}/g, mentor ? mentor.name : 'Project Supervisor')
      .replace(/{{date}}/g, todayStr)
      .replace(/{{completionPercentage}}/g, completionPercentage);
  }

  db.notifications.unshift({
    id: 'n_' + Date.now() + '_s',
    title: `Review ${reviewNumber} ${reviewStatus} — ${student.name}`,
    message: studentMsgText,
    date: new Date().toLocaleString(),
    read: false,
    type: 'review'
  });

  if (mentor) {
    if (activeMentorTpl) {
      mentorMsgText = activeMentorTpl.template
        .replace(/{{mentorName}}/g, mentor.name)
        .replace(/{{reviewNumber}}/g, reviewNumber)
        .replace(/{{batchNumber}}/g, student.batch_number)
        .replace(/{{projectTitle}}/g, project ? project.project_title : 'Final Year Project')
        .replace(/{{studentList}}/g, student.name + ' (' + student.register_number + ')')
        .replace(/{{reviewStatus}}/g, reviewStatus)
        .replace(/{{date}}/g, todayStr);
    }

    db.notifications.unshift({
      id: 'n_' + Date.now() + '_m',
      title: `Mentor Notification: ${student.name} Review ${reviewNumber}`,
      message: mentorMsgText,
      date: new Date().toLocaleString(),
      read: false,
      type: 'mentor'
    });
  }

  // Real Email Dispatch via Background Queue / Nodemailer if enabled
  if (db.admin?.settings?.emailEnabled) {
    if (student && student.email) {
      emailQueue.enqueue({
        to: student.email,
        subject: `Review ${reviewNumber} Status: ${reviewStatus} — ${project ? project.project_title : 'Project Update'}`,
        text: studentMsgText
      }).catch(err => console.error(`[Notification Email] Error enqueuing for student ${student.email}:`, err.message));
    }
    if (mentor && mentor.email) {
      emailQueue.enqueue({
        to: mentor.email,
        subject: `Mentor Review Notice: ${student.name} (Review ${reviewNumber})`,
        text: mentorMsgText
      }).catch(err => console.error(`[Notification Email] Error enqueuing for mentor ${mentor.email}:`, err.message));
    }
  }

  saveLocalDatabase(db);
}

export const getReviews = (req, res) => {
  const db = getLocalDatabase();
  res.json(db.reviews || []);
};

export const saveReview = (req, res) => {
  const { student_register_number, review_number, review_status, date, marks, mark, comments, project_status } = req.body;
  const regNo = parseInt(student_register_number, 10);
  const revNum = parseInt(review_number, 10);
  const markVal = marks !== undefined ? Number(marks) : (mark !== undefined ? Number(mark) : 0);

  const db = getLocalDatabase();
  let idx = db.reviews.findIndex(r => r.student_register_number === regNo && r.review_number === revNum);
  let reviewObj;

  if (idx !== -1) {
    db.reviews[idx] = {
      ...db.reviews[idx],
      review_status: review_status || db.reviews[idx].review_status,
      date: date !== undefined ? date : (db.reviews[idx].date || new Date().toISOString().split('T')[0]),
      mark: markVal,
      comments: comments !== undefined ? comments : db.reviews[idx].comments,
      completed: req.body.completed !== undefined ? Boolean(req.body.completed) : (db.reviews[idx].completed || false)
    };
    reviewObj = db.reviews[idx];
  } else {
    reviewObj = {
      id: `r_${Date.now()}_${revNum}`,
      review_number: revNum,
      batch_number: 35,
      student_register_number: regNo,
      project_title: 'Project',
      project_status: project_status || 'In Progress',
      review_status: review_status || 'Pending',
      mark: markVal,
      max_mark: 10,
      completed: req.body.completed !== undefined ? Boolean(req.body.completed) : false,
      date: date || new Date().toISOString().split('T')[0],
      comments: comments || ''
    };
    db.reviews.push(reviewObj);
  }

  // Sync project_status
  if (project_status) {
    db.projects.forEach(p => {
      if (p.student1_register_number === regNo || p.student2_register_number === regNo) {
        p.project_status = project_status;
      }
    });
    db.reviews.forEach(r => {
      if (r.student_register_number === regNo) {
        r.project_status = project_status;
      }
    });
  }

  // Trigger notification ONLY when explicitly requested (manual check: false -> true)
  if (req.body.sendNotification === true || req.body.triggerMessage === true) {
    const student = db.students.find(s => s.register_number === regNo);
    if (student) {
      triggerNotification(student, revNum, review_status || 'Completed', markVal);
    }
  }

  saveLocalDatabase(db);
  res.json({ success: true, review: reviewObj });
};

export const updateReview = (req, res) => {
  const { id } = req.params;
  const db = getLocalDatabase();
  const idx = db.reviews.findIndex(r => r.id === id);

  if (idx !== -1) {
    const updated = { ...db.reviews[idx], ...req.body };
    db.reviews[idx] = updated;

    // Trigger notification ONLY when explicitly requested (manual check: false -> true)
    if (req.body.sendNotification === true || req.body.triggerMessage === true) {
      const student = db.students.find(s => s.register_number === updated.student_register_number);
      if (student) {
        triggerNotification(student, updated.review_number, updated.review_status, updated.mark);
      }
    }

    saveLocalDatabase(db);
    return res.json({ success: true, review: updated });
  }
  res.status(404).json({ error: 'Review record not found' });
};

export const batchSaveReviews = (req, res) => {
  const { reviews } = req.body;
  if (!Array.isArray(reviews)) {
    return res.status(400).json({ error: 'Reviews array required' });
  }

  const db = getLocalDatabase();
  reviews.forEach(updatedReview => {
    const idx = db.reviews.findIndex(r => r.id === updatedReview.id || (r.student_register_number === updatedReview.student_register_number && r.review_number === updatedReview.review_number));
    if (idx !== -1) {
      db.reviews[idx] = { ...db.reviews[idx], ...updatedReview };
      if (updatedReview.completed || updatedReview.review_status === 'Completed') {
        const student = db.students.find(s => s.register_number === updatedReview.student_register_number);
        if (student) {
          triggerNotification(student, updatedReview.review_number, updatedReview.review_status, updatedReview.mark);
        }
      }
    }
  });

  saveLocalDatabase(db);
  res.json({ success: true, message: 'Batch reviews updated successfully.' });
};

export default {
  getReviews,
  saveReview,
  updateReview,
  batchSaveReviews
};
