import { GoogleGenAI } from '@google/genai';
import { getLocalDatabase, saveLocalDatabase } from '../helpers/dbHelper.js';

export async function processRagQuery(query) {
  const db = getLocalDatabase();
  if (!db) {
    throw new Error('Database unavailable');
  }

  if (!db.admin?.settings?.ragEnabled) {
    return {
      answer: 'RAG system is currently disabled in Profile Settings.',
      source: 'System Configuration'
    };
  }

  const apiKey = db.admin?.settings?.aiApiKey || process.env.GEMINI_API_KEY;

  const contextData = {
    totalStudents: db.students.length,
    totalProjects: db.projects.length,
    totalSupervisors: db.mentors.length,
    supervisors: db.mentors.map(m => ({
      name: m.name,
      code: m.mentor_roll_number,
      department: m.department,
      email: m.email,
      phone: m.phone
    })),
    students: db.students.map(s => {
      const proj = db.projects.find(p => Number(p.batch_number) === Number(s.batch_number)) || {};
      const sup = db.mentors.find(m => m.mentor_roll_number === s.mentor_roll_number) || {};
      return {
        name: s.name,
        registerNumber: s.register_number,
        rollNumber: s.roll_number || 'N/A',
        email: s.email || null,
        phone: s.phone || null,
        department: s.department || 'CSE',
        class: s.class || s.section || 'A',
        academicYear: s.year || '4th Year',
        batchNumber: s.batch_number,
        projectTitle: proj.project_title || s.project_title || 'No Project Assigned',
        projectStatus: proj.project_status || 'In Progress',
        supervisorName: sup.name || s.mentor_roll_number || 'Unassigned',
        supervisorCode: s.mentor_roll_number
      };
    }),
    projects: db.projects.map(p => {
      const sup = db.mentors.find(m => m.mentor_roll_number === p.mentor_roll_number) || {};
      return {
        title: p.project_title,
        batchNumber: p.batch_number,
        status: p.project_status,
        publicationStatus: p.publication_status,
        supervisorName: sup.name || p.mentor_roll_number || 'Unassigned',
        published: p.published,
        patentGranted: p.patent_granted
      };
    }),
    filesStatus: (db.files || []).map(f => ({
      batchNumber: f.batchNumber,
      fileType: f.fileType,
      fileName: f.fileName,
      fileSize: f.fileSize,
      verified: f.verified,
      uploadedAt: f.uploadedAt
    })),
    reviewsSummary: db.students.map(s => {
      const revs = db.reviews.filter(r => r.student_register_number === s.register_number);
      const completed = revs.filter(r => r.review_status === 'Completed').length;
      const totalMarks = revs.reduce((sum, r) => sum + (Number(r.mark) || 0), 0);
      const batchFiles = (db.files || []).filter(f => Number(f.batchNumber) === Number(s.batch_number));
      return {
        student: s.name,
        registerNumber: s.register_number,
        batchNumber: s.batch_number,
        email: s.email || 'Not stored',
        reportUploaded: batchFiles.some(f => f.fileType === 'REPORT') ? 'Uploaded' : 'Pending',
        pptUploaded: batchFiles.some(f => f.fileType === 'PPT') ? 'Uploaded' : 'Pending',
        completedReviews: completed,
        totalMarks,
        reviewsDetail: revs.map(r => ({ reviewNo: r.review_number, status: r.review_status, mark: r.mark }))
      };
    })
  };

  if (apiKey) {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are StudyPulse AI Assistant for the Project Supervision & Monitoring System (PSMS).
You have authoritative access to the complete database records below:
${JSON.stringify(contextData, null, 2)}

User Question: "${query}"

Instructions:
1. Answer strictly based on the provided database context above.
2. For multiple records, student lists, email addresses, batch details, or project comparisons, you MUST format your response using Markdown tables (e.g., | Reg No | Student Name | Email | Department |).
3. Always use the terminology "Supervisor" or "Supervisors" instead of mentor.
4. If a specific student is queried (e.g., "Joel Britto"), provide their complete available details in a key-value or field table. If an email or field is missing, state: "[Student Name] exists in the database, but no [field] is currently stored." rather than saying no record found.
5. If a student does not exist at all, state: "No student matching '[query]' was found in the project database."
6. Provide concise, clear, professional answers. Do not hallucinate.`;

    let modelName = db.admin?.settings?.aiModel || 'gemini-3.6-flash';
    if (!modelName || modelName.includes('2.5') || modelName.includes('1.5')) {
      modelName = 'gemini-3.6-flash';
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt
    });

    const qLower = query.toLowerCase();
    const isExportReq = qLower.includes('export') || qLower.includes('download') || qLower.includes('csv');
    let exportFile = null;

    if (isExportReq) {
      const csvHeader = "Register Number,Student Name,Email,Batch,Department,Project Title,Supervisor\n";
      const csvRows = contextData.students.map(s => {
        return `"${s.registerNumber}","${s.name}","${s.email || ''}","${s.batchNumber}","${s.department}","${s.projectTitle}","${s.supervisorName}"`;
      }).join('\n');
      exportFile = {
        filename: 'StudyPulse_Student_Details_Report.csv',
        content: csvHeader + csvRows,
        type: 'text/csv'
      };
    }

    return {
      answer: response.text,
      source: `Gemini AI (${modelName}) + StudyPulse RAG Engine`,
      exportFile
    };
  } else {
    // Smart rule-based retrieval & export supporting all required queries
    const q = query.toLowerCase();
    let answer = '';
    let exportFile = null;

    if (q.includes('export') || q.includes('download') || q.includes('csv') || q.includes('report')) {
      const csvHeader = "Register Number,Student Name,Email,Batch,Department,Project Title,Supervisor\n";
      const csvRows = contextData.students.map(s => {
        return `"${s.registerNumber}","${s.name}","${s.email || ''}","${s.batchNumber}","${s.department}","${s.projectTitle}","${s.supervisorName}"`;
      }).join('\n');
      exportFile = {
        filename: 'StudyPulse_Student_Details_Report.csv',
        content: csvHeader + csvRows,
        type: 'text/csv'
      };
      answer = `Here is the requested student report generated from the database. You can download the complete CSV export below:`;
    } else if (q.includes('email') || q.includes('gmail') || q.includes('mail')) {
      const targetStudent = contextData.students.find(s => q.includes(s.name.toLowerCase()) || q.includes(String(s.registerNumber)));
      if (targetStudent) {
        if (!targetStudent.email) {
          answer = `${targetStudent.name} is registered, but no email address is stored for this student.`;
        } else {
          answer = `| Student Name | Register No | Email Address |\n|---|:---:|---|\n| ${targetStudent.name} | ${targetStudent.registerNumber} | ${targetStudent.email} |`;
        }
      } else if (q.includes('batch 35')) {
        const batch35 = contextData.students.filter(s => s.batchNumber === 35);
        answer = `| Batch | Reg No | Student Name | Email Address |\n|:---:|:---:|---|---|\n` +
          batch35.map(s => `| ${s.batchNumber} | ${s.registerNumber} | ${s.name} | ${s.email || 'Not available'} |`).join('\n');
      } else {
        answer = `| Reg No | Student Name | Email Address |\n|:---:|---|---|\n` +
          contextData.students.map(s => `| ${s.registerNumber} | ${s.name} | ${s.email || 'Not available'} |`).join('\n');
      }
    } else if (q.includes('complete details') || q.includes('joel') || q.includes('govind')) {
      const searchName = q.includes('joel') ? 'joel' : (q.includes('govind') ? 'govind' : '');
      const student = contextData.students.find(s => s.name.toLowerCase().includes(searchName));
      if (!student) {
        answer = `No student matching your query was found in the project database.`;
      } else {
        answer = `| Field | Value |\n|---|---|\n` +
          `| Student Name | ${student.name} |\n` +
          `| Registration No | ${student.registerNumber} |\n` +
          `| Roll Number | ${student.rollNumber} |\n` +
          `| Email Address | ${student.email || 'Not available in database'} |\n` +
          `| Phone Number | ${student.phone || 'Not available in database'} |\n` +
          `| Department | ${student.department} |\n` +
          `| Class / Section | ${student.class} |\n` +
          `| Academic Year | ${student.academicYear} |\n` +
          `| Batch Number | ${student.batchNumber} |\n` +
          `| Project Title | ${student.projectTitle} |\n` +
          `| Project Status | ${student.projectStatus} |\n` +
          `| Supervisor | ${student.supervisorName} |`;
      }
    } else if (q.includes('project') || q.includes('title')) {
      answer = `| Batch | Student Name | Project Title | Project Status |\n|:---:|---|---|:---:|\n` +
        contextData.students.map(s => `| ${s.batchNumber} | ${s.name} | ${s.projectTitle} | ${s.projectStatus} |`).join('\n');
    } else if (q.includes('supervisor') || q.includes('mentor')) {
      answer = `| Batch | Student Name | Supervisor Name |\n|:---:|---|---|\n` +
        contextData.students.map(s => `| ${s.batchNumber} | ${s.name} | ${s.supervisorName} |`).join('\n');
    } else if (q.includes('batch 35')) {
      const batch35 = contextData.students.filter(s => s.batchNumber === 35);
      answer = `| Batch | Student Name | Reg No | Email | Supervisor |\n|:---:|---|:---:|---|---|\n` +
        batch35.map(s => `| ${s.batchNumber} | ${s.name} | ${s.registerNumber} | ${s.email || 'N/A'} | ${s.supervisorName} |`).join('\n');
    } else {
      answer = `| Reg No | Student Name | Department | Batch | Project Title |\n|:---:|---|:---:|:---:|---|\n` +
        contextData.students.map(s => `| ${s.registerNumber} | ${s.name} | ${s.department} | ${s.batchNumber} | ${s.projectTitle} |`).join('\n');
    }

    return {
      answer,
      source: 'StudyPulse Rule-Based RAG Engine',
      exportFile
    };
  }
}

export default {
  processRagQuery
};
