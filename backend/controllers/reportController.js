import { getLocalDatabase } from '../helpers/dbHelper.js';

export const getFinalReport = (req, res) => {
  const regNo = parseInt(req.params.studentRegisterNumber, 10);
  const db = getLocalDatabase();
  const student = db.students.find(s => s.register_number === regNo);

  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  const mentor = db.mentors.find(m => m.mentor_roll_number === student.mentor_roll_number);
  const team = db.teams.find(t => t.student1_register_number === regNo || t.student2_register_number === regNo);
  const project = db.projects.find(p => p.student1_register_number === regNo || p.student2_register_number === regNo);
  const studentReviews = db.reviews.filter(r => r.student_register_number === regNo).sort((a, b) => a.review_number - b.review_number);

  const completedCount = studentReviews.filter(r => r.review_status === 'Completed').length;
  const notAttendedCount = studentReviews.filter(r => r.review_status === 'Attended but Not Executed' || r.review_status === 'Not Completed').length;
  const totalMark = studentReviews.reduce((sum, r) => sum + (Number(r.mark) || 0), 0);
  const completionPercentage = parseFloat(((completedCount / 6) * 100).toFixed(2));

  let finalStatus = 'In Progress';
  if (completedCount === 6 && project && project.project_status === 'Completed') {
    finalStatus = 'Passed / Project Completed';
  } else if (completedCount >= 4) {
    finalStatus = 'Good Progress (Pending Final Reviews)';
  }

  const finalReport = {
    student,
    mentor,
    team,
    project,
    reviews: studentReviews,
    summary: {
      totalMark,
      numberReviewCompleted: completedCount,
      notAttendedReviewCount: notAttendedCount,
      completionPercentage,
      finalStatus,
      generatedAt: new Date().toISOString()
    }
  };

  res.json(finalReport);
};

export default {
  getFinalReport
};
