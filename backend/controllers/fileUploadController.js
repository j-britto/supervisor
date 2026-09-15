import path from 'path';
import multer from 'multer';
import { getLocalDatabase, saveLocalDatabase } from '../helpers/dbHelper.js';
import {
  saveFileToStorage,
  getFileFromStorage,
  getAllFilesMetadata,
  setFileVerified,
  setNotificationSent,
  getOrCreateUploadLink,
  getUploadLinkByToken,
  setUploadLinkSent,
  getAllUploadLinks,
  isMySQLConnected,
  clearAllFilesAndStorage
} from '../config/mysql.js';
import { executeSQL, getOracleStatus } from '../config/oracle.js';
import { sendEmail, buildStudyPulseEmailTemplate, isValidEmail } from '../services/emailService.js';
import { scanFileBuffer } from '../services/antivirusService.js';
import { env } from '../config/env.config.js';

// Configure Multer with memory storage for direct MySQL BLOB ingestion
const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB maximum
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const rawType = (req.body.fileType || '').toUpperCase();

    if (rawType === 'REPORT' || ext === '.pdf') {
      if (ext !== '.pdf') {
        return cb(new Error('Validation Error: Project Reports must be in PDF format (.pdf).'));
      }
    } else if (rawType === 'PPT' || ext === '.ppt' || ext === '.pptx') {
      if (ext !== '.ppt' && ext !== '.pptx') {
        return cb(new Error('Validation Error: Presentations must be in PowerPoint format (.ppt, .pptx).'));
      }
    } else {
      if (ext !== '.pdf' && ext !== '.ppt' && ext !== '.pptx') {
        return cb(new Error('Validation Error: Unsupported file format. Please upload PDF (.pdf) or PowerPoint (.ppt, .pptx).'));
      }
    }
    cb(null, true);
  }
});

// Student multi-file upload middleware (Report PDF + PPT presentation)
export const studentUploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB per file
  }
}).fields([
  { name: 'report', maxCount: 1 },
  { name: 'ppt', maxCount: 1 }
]);

/**
 * Generate a clean sample PDF buffer for initial seeding if needed
 */
function createSamplePdfBuffer(batchNumber, projectTitle) {
  const content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 190 >>
stream
BT
/F1 20 Tf
50 720 Td
(StudyPulse AI - Project Report) Tj
/F1 14 Tf
0 -40 Td
(Batch Number: ${batchNumber}) Tj
0 -30 Td
(Project: ${projectTitle.replace(/[()]/g, '')}) Tj
0 -30 Td
(Verification Status: Verified by Project Coordinator) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
00000000117 00000 n 
0000000227 00000 n 
0000000469 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
538
%%EOF`;
  return Buffer.from(content, 'utf-8');
}

/**
 * GET /api/files or /api/file-uploads
 * Returns all teams grouped by batchNumber with report/ppt metadata,
 * student profiles, supervisor, student upload link, publication status, and verification state.
 */
export const getFileUploads = async (req, res) => {
  try {
    const db = getLocalDatabase();
    if (!db) {
      return res.status(500).json({ error: 'Failed to access database' });
    }

    const filesMeta = await getAllFilesMetadata();
    const appBaseUrl = env.APP_URL || `${req.protocol}://${req.get('host')}` || 'http://localhost:3000';

    // Group students by Batch Number (batch_number is the unique team identifier)
    const batchMap = new Map();

    (db.students || []).forEach(student => {
      const bNum = parseInt(student.batch_number, 10) || 35;
      if (!batchMap.has(bNum)) {
        batchMap.set(bNum, {
          batchNumber: bNum,
          students: [],
          project: null,
          supervisor: null
        });
      }
      batchMap.get(bNum).students.push({
        id: student.id,
        name: student.name,
        register_number: student.register_number,
        roll_number: student.roll_number,
        email: student.email,
        phone: student.phone,
        department: student.department,
        class: student.class,
        photo: student.photo
      });
    });

    // Merge Project details
    (db.projects || []).forEach(proj => {
      const bNum = parseInt(proj.batch_number, 10) || 35;
      if (!batchMap.has(bNum)) {
        batchMap.set(bNum, {
          batchNumber: bNum,
          students: [],
          project: null,
          supervisor: null
        });
      }
      const item = batchMap.get(bNum);
      item.project = proj;

      const sup = (db.mentors || []).find(m => m.mentor_roll_number === proj.mentor_roll_number);
      if (sup) {
        item.supervisor = {
          name: sup.name,
          email: sup.email,
          supervisor_roll_number: sup.mentor_roll_number,
          phone: sup.phone,
          department: sup.department
        };
      }
    });

    // Ensure Batch 35 has a default seeded report if empty and batch 35 students exist
    const batch35Report = filesMeta.find(f => Number(f.batch_number) === 35 && f.file_type === 'REPORT');
    const hasBatch35Student = (db.students || []).some(s => Number(s.batch_number) === 35);
    if (!batch35Report && hasBatch35Student) {
      const sampleBuffer = createSamplePdfBuffer(35, 'GrowOn - Smart Soil Health & Crop Advisory AI System');
      await saveFileToStorage({
        batchNumber: 35,
        fileType: 'REPORT',
        fileName: 'Batch35_GrowOn_Final_Report.pdf',
        mimeType: 'application/pdf',
        fileSize: sampleBuffer.length,
        buffer: sampleBuffer
      });
      await setFileVerified(35, 'REPORT', 'Project Coordinator');
      const refreshedMeta = await getAllFilesMetadata();
      filesMeta.length = 0;
      filesMeta.push(...refreshedMeta);
    }

    const results = [];

    for (const [bNum, teamData] of batchMap.entries()) {
      const reportFile = filesMeta.find(f => Number(f.batch_number) === Number(bNum) && f.file_type === 'REPORT');
      const pptFile = filesMeta.find(f => Number(f.batch_number) === Number(bNum) && f.file_type === 'PPT');

      const proj = teamData.project;
      const projectTitle = proj?.project_title || `Batch ${bNum} Final Year Project`;
      const publicationStatus = proj?.publication_status || 'Submitted';

      const isReportUploaded = Boolean(reportFile);
      const isPptUploaded = Boolean(pptFile);

      // Student Upload Link with cryptographically secure token
      const uploadLinkRecord = await getOrCreateUploadLink(bNum);
      const studentUploadPath = `/upload/${bNum}/${uploadLinkRecord.token}`;
      const studentUploadUrl = `${appBaseUrl}${studentUploadPath}`;
      const uploadLinkSent = Boolean(uploadLinkRecord.upload_link_sent);
      const uploadLinkSentAt = uploadLinkRecord.upload_link_sent_at || null;

      // Determine verification status:
      // Flow: NOT UPLOADED -> UPLOADED / PENDING VERIFICATION -> VERIFIED -> NOTIFIED
      let verificationStatus = 'Not Uploaded';
      let isVerified = false;
      let verifiedAt = null;
      let verifiedBy = null;
      let supervisorNotified = false;
      let studentsNotified = false;
      let notificationSent = false;
      let notificationSentAt = null;

      if (isReportUploaded || isPptUploaded) {
        if (reportFile?.verified || pptFile?.verified) {
          verificationStatus = 'Verified';
          isVerified = true;
          verifiedAt = reportFile?.verified_at || pptFile?.verified_at;
          verifiedBy = reportFile?.verified_by || pptFile?.verified_by || 'Project Coordinator';
        } else {
          verificationStatus = 'Pending Verification';
        }

        supervisorNotified = Boolean(reportFile?.supervisor_notified || pptFile?.supervisor_notified);
        studentsNotified = Boolean(reportFile?.students_notified || pptFile?.students_notified);
        notificationSent = supervisorNotified && studentsNotified;
        notificationSentAt = reportFile?.notification_sent_at || pptFile?.notification_sent_at;
      }

      // Verified file links are ONLY provided after coordinator verification
      const uploadedLink = isVerified && isReportUploaded ? `projectreport.${bNum}` : (isVerified && isPptUploaded ? `projectppt.${bNum}` : '');
      const reportDownloadUrl = isReportUploaded ? `/api/files/report/${bNum}` : null;
      const pptDownloadUrl = isPptUploaded ? `/api/files/ppt/${bNum}` : null;

      results.push({
        batchNumber: bNum,
        students: teamData.students,
        supervisor: teamData.supervisor || {
          name: 'Dr. Vasanthi R.',
          email: 'vasanthi@studypulse.edu',
          supervisor_roll_number: 'SUP-401',
          department: 'Computer Science & Engineering'
        },
        projectTitle,
        publicationStatus,
        reportUploaded: isReportUploaded,
        pptUploaded: isPptUploaded,
        reportFile: reportFile ? {
          fileName: reportFile.file_name,
          fileSize: reportFile.file_size,
          uploadedAt: reportFile.uploaded_at,
          verified: reportFile.verified
        } : null,
        pptFile: pptFile ? {
          fileName: pptFile.file_name,
          fileSize: pptFile.file_size,
          uploadedAt: pptFile.uploaded_at,
          verified: pptFile.verified
        } : null,
        studentUploadToken: uploadLinkRecord.token,
        studentUploadPath,
        studentUploadUrl,
        uploadLinkSent,
        uploadLinkSentAt,
        uploadedLink,
        reportDownloadUrl,
        pptDownloadUrl,
        verificationStatus,
        uploadVerified: isVerified,
        verifiedAt,
        verifiedBy,
        supervisorNotified,
        studentsNotified,
        notificationSent,
        notificationSentAt,
        mySqlActive: isMySQLConnected()
      });
    }

    results.sort((a, b) => Number(a.batchNumber) - Number(b.batchNumber));
    res.json(results);
  } catch (error) {
    console.error('[FileUploadController] Error getting file uploads:', error);
    res.status(500).json({ error: 'Internal server error fetching file upload registry.' });
  }
};

/**
 * GET /api/files/upload-info/:batchNumber/:token
 * Public endpoint for the Student Upload Page.
 * Authenticates via token and retrieves team metadata.
 */
export const getStudentUploadInfo = async (req, res) => {
  try {
    const { batchNumber, token } = req.params;
    if (!batchNumber || !token) {
      return res.status(400).json({ error: 'Batch Number and secure upload token are required.' });
    }

    const bNum = parseInt(batchNumber, 10);
    const link = await getUploadLinkByToken(token);

    if (!link || Number(link.batch_number) !== bNum) {
      return res.status(403).json({
        error: 'Invalid or unauthorized upload link. Please verify the URL or request a new link from your Project Coordinator.'
      });
    }

    const db = getLocalDatabase();
    if (!db) {
      return res.status(500).json({ error: 'Database access failure.' });
    }

    const batchStudents = (db.students || []).filter(s => Number(s.batch_number) === bNum);
    const project = (db.projects || []).find(p => Number(p.batch_number) === bNum);
    const supervisor = (db.mentors || []).find(m => project && m.mentor_roll_number === project.mentor_roll_number) ||
                       (batchStudents[0] ? (db.mentors || []).find(m => m.mentor_roll_number === batchStudents[0].mentor_roll_number) : null) ||
                       (db.mentors && db.mentors[0]);

    const reportFile = await getFileFromStorage(bNum, 'REPORT');
    const pptFile = await getFileFromStorage(bNum, 'PPT');

    let verificationStatus = 'Not Uploaded';
    if (reportFile || pptFile) {
      if (reportFile?.verified || pptFile?.verified) {
        verificationStatus = 'Verified';
      } else {
        verificationStatus = 'Pending Verification';
      }
    }

    return res.json({
      batchNumber: bNum,
      projectTitle: project?.project_title || `Batch ${bNum} Final Year Project`,
      projectDescription: project?.project_description || project?.abstract || 'Final Year Project Work',
      domain: project?.domain || 'Computer Science & Engineering',
      students: batchStudents.map(s => ({
        id: s.id,
        name: s.name,
        register_number: s.register_number,
        roll_number: s.roll_number,
        email: s.email,
        department: s.department
      })),
      supervisor: supervisor ? {
        name: supervisor.name,
        email: supervisor.email,
        department: supervisor.department
      } : null,
      reportUploaded: Boolean(reportFile),
      reportFileName: reportFile?.file_name || null,
      reportFileSize: reportFile?.file_size || null,
      reportUploadedAt: reportFile?.uploaded_at || null,
      pptUploaded: Boolean(pptFile),
      pptFileName: pptFile?.file_name || null,
      pptFileSize: pptFile?.file_size || null,
      pptUploadedAt: pptFile?.uploaded_at || null,
      verificationStatus,
      token
    });
  } catch (err) {
    console.error('[FileUploadController] getStudentUploadInfo error:', err);
    return res.status(500).json({ error: 'Failed to load team upload details.' });
  }
};

/**
 * POST /api/files/student-upload/:batchNumber/:token
 * Public upload endpoint for students.
 * Token determines the batch to prevent parameter tampering.
 */
export const handleStudentUpload = async (req, res) => {
  try {
    const { batchNumber, token } = req.params;
    if (!token) {
      return res.status(400).json({ error: 'Secure upload token is required.' });
    }

    // Determine batch_number strictly from upload token
    const link = await getUploadLinkByToken(token);
    if (!link) {
      return res.status(403).json({ error: 'Invalid or expired upload token.' });
    }

    const verifiedBatchNumber = Number(link.batch_number);

    // Reject tampering if batchNumber in URL does not match token's batch
    if (batchNumber && Number(batchNumber) !== verifiedBatchNumber) {
      return res.status(403).json({
        error: `Security Violation: Token does not match Batch ${batchNumber}. Request rejected.`
      });
    }

    // Multer files: report and/or ppt
    const files = req.files || {};
    const reportFile = files.report ? files.report[0] : null;
    const pptFile = files.ppt ? files.ppt[0] : null;

    if (!reportFile && !pptFile) {
      return res.status(400).json({
        error: 'Please select at least one file to upload (Report PDF or PPT presentation).'
      });
    }

    const uploadedResults = [];

    // Process Report PDF
    if (reportFile) {
      const ext = path.extname(reportFile.originalname).toLowerCase();
      if (ext !== '.pdf') {
        return res.status(400).json({
          error: 'Validation Error: Project Report must strictly be a PDF document (.pdf).'
        });
      }

      const scanResult = scanFileBuffer(reportFile.buffer, reportFile.originalname);
      if (!scanResult.isClean) {
        return res.status(400).json({
          error: `Antivirus Shield Alert: Report rejected! Detected ${scanResult.threatName}`
        });
      }

      await saveFileToStorage({
        batchNumber: verifiedBatchNumber,
        fileType: 'REPORT',
        fileName: reportFile.originalname,
        mimeType: 'application/pdf',
        fileSize: reportFile.size,
        buffer: reportFile.buffer
      });

      uploadedResults.push('Report PDF');
    }

    // Process PPT Presentation
    if (pptFile) {
      const ext = path.extname(pptFile.originalname).toLowerCase();
      if (ext !== '.ppt' && ext !== '.pptx') {
        return res.status(400).json({
          error: 'Validation Error: Presentation must strictly be a PowerPoint file (.ppt, .pptx).'
        });
      }

      const scanResult = scanFileBuffer(pptFile.buffer, pptFile.originalname);
      if (!scanResult.isClean) {
        return res.status(400).json({
          error: `Antivirus Shield Alert: Presentation rejected! Detected ${scanResult.threatName}`
        });
      }

      const mime = ext === '.ppt' ? 'application/vnd.ms-powerpoint' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

      await saveFileToStorage({
        batchNumber: verifiedBatchNumber,
        fileType: 'PPT',
        fileName: pptFile.originalname,
        mimeType: mime,
        fileSize: pptFile.size,
        buffer: pptFile.buffer
      });

      uploadedResults.push('Presentation Slides');
    }

    // Update project record in local DB if present
    const db = getLocalDatabase();
    if (db && db.projects) {
      const proj = db.projects.find(p => Number(p.batch_number) === verifiedBatchNumber);
      if (proj) {
        if (reportFile) proj.report_uploaded = 1;
        if (pptFile) proj.ppt_uploaded = 1;
        saveLocalDatabase(db);
      }
    }

    return res.json({
      success: true,
      message: `${uploadedResults.join(' and ')} successfully uploaded for Batch ${verifiedBatchNumber}. Submission is now Pending Verification.`,
      batchNumber: verifiedBatchNumber,
      verificationStatus: 'Pending Verification',
      reportUploaded: Boolean(reportFile),
      pptUploaded: Boolean(pptFile)
    });
  } catch (error) {
    console.error('[FileUploadController] Student upload error:', error);
    return res.status(500).json({ error: error.message || 'File upload failed.' });
  }
};

/**
 * POST /api/files/send-upload-link
 * Dispatches the Student Upload Link to all students of the batch via Nodemailer.
 * Tracks upload_link_sent and upload_link_sent_at.
 */
export const sendStudentUploadLinkEmail = async (req, res) => {
  try {
    const { batchNumber, forceResend = false } = req.body;
    if (!batchNumber) {
      return res.status(400).json({ error: 'Batch Number is required.' });
    }

    const bNum = parseInt(batchNumber, 10);
    const db = getLocalDatabase();
    if (!db) {
      return res.status(500).json({ error: 'Database access failure.' });
    }

    const link = await getOrCreateUploadLink(bNum);
    if (!forceResend && link.upload_link_sent) {
      return res.status(400).json({
        success: false,
        alreadySent: true,
        message: `Upload link was already emailed to Batch ${bNum} students. Use 'Resend' to send again.`
      });
    }

    const batchStudents = (db.students || []).filter(s => Number(s.batch_number) === bNum);
    const project = (db.projects || []).find(p => Number(p.batch_number) === bNum);
    const supervisor = (db.mentors || []).find(m => project && m.mentor_roll_number === project.mentor_roll_number) ||
                       (batchStudents[0] ? (db.mentors || []).find(m => m.mentor_roll_number === batchStudents[0].mentor_roll_number) : null) ||
                       (db.mentors && db.mentors[0]);

    const projectTitle = project?.project_title || `Batch ${bNum} Final Year Project`;
    const studentNames = batchStudents.map(s => s.name).join(', ') || `Batch ${bNum} Students`;

    const appUrl = env.APP_URL || `${req.protocol}://${req.get('host')}` || 'http://localhost:3000';
    const uploadUrl = `${appUrl}/upload/${bNum}/${link.token}`;

    const emailSubject = `Final Year Project Submission Link — Batch ${bNum} | StudyPulse AI`;

    const plainTextBody = `
StudyPulse AI - Final Year Project Submission Link

Batch Number: ${bNum}
Project: ${projectTitle}
Students: ${studentNames}
Supervisor: ${supervisor?.name || 'Project Supervisor'}

Dear Students,
Your Project Coordinator has generated the secure submission link for your Final Year Project files.

Please use the unique link below to submit your Project Report (.pdf) and Presentation Slides (.ppt, .pptx):

Upload Link:
${uploadUrl}

IMPORTANT INSTRUCTIONS:
1. Ensure your report is in PDF format (.pdf).
2. Ensure your presentation is in PowerPoint format (.ppt or .pptx).
3. Do not share this link with other teams. It is unique to Batch ${bNum}.
4. Once submitted, your files will be marked as "Pending Verification" until reviewed by the Project Coordinator.

Regards,
Project Coordinator Office
StudyPulse AI Academic Portal
`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e3fa6; padding: 22px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px;">StudyPulse AI — Project Submission Link</h2>
          <p style="color: #93c5fd; margin: 6px 0 0 0; font-size: 13px;">Final Year Project Supervision Portal</p>
        </div>

        <div style="padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 15px; margin-top: 0;">Dear <strong>${studentNames}</strong>,</p>
          <p style="font-size: 14px;">The Project Coordinator has enabled the final project submission portal for your team.</p>

          <table style="width: 100%; border-collapse: collapse; margin: 18px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
            <tr>
              <td style="padding: 9px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569; width: 35%;">Batch Number:</td>
              <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; color: #1e3fa6; font-weight: bold;">Batch ${bNum}</td>
            </tr>
            <tr>
              <td style="padding: 9px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569;">Project Title:</td>
              <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${projectTitle}</td>
            </tr>
            <tr>
              <td style="padding: 9px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569;">Supervisor:</td>
              <td style="padding: 9px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${supervisor?.name || 'Project Supervisor'}</td>
            </tr>
            <tr>
              <td style="padding: 9px 12px; font-weight: bold; color: #475569;">Accepted Formats:</td>
              <td style="padding: 9px 12px; color: #0f172a;">Report (.pdf) & Presentation (.ppt, .pptx)</td>
            </tr>
          </table>

          <div style="text-align: center; margin: 26px 0;">
            <a href="${uploadUrl}" style="background: #1e3fa6; color: #ffffff; padding: 12px 28px; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 6px; display: inline-block; box-shadow: 0 2px 4px rgba(30,63,166,0.3);">
              Upload Project Files Now &rarr;
            </a>
          </div>

          <p style="font-size: 12px; color: #64748b; background: #f1f5f9; padding: 10px; border-radius: 6px; word-break: break-all;">
            <strong>Direct Link:</strong><br>
            <a href="${uploadUrl}" style="color: #1e3fa6;">${uploadUrl}</a>
          </p>

          <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
            Note: This link is cryptographically tied to Batch ${bNum}. Once uploaded, your submission will be reviewed by the Project Coordinator before final verification.<br><br>
            <strong>StudyPulse AI Project Coordinator Office</strong>
          </p>
        </div>
      </div>
    `;

    const studentEmails = batchStudents
      .map(s => s.email)
      .filter(email => isValidEmail(email));

    const dispatched = [];
    for (const email of studentEmails) {
      try {
        const resEmail = await sendEmail({
          to: email,
          subject: emailSubject,
          text: plainTextBody,
          html: buildStudyPulseEmailTemplate(emailSubject, plainTextBody, htmlBody)
        });
        dispatched.push({ email, success: resEmail.success });
      } catch (e) {
        console.error(`Failed sending to ${email}:`, e.message);
      }
    }

    await setUploadLinkSent(bNum);

    return res.json({
      success: true,
      message: `Student upload link sent to ${dispatched.length} student(s) of Batch ${bNum}.`,
      dispatched,
      uploadUrl,
      uploadLinkSentAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[FileUploadController] sendStudentUploadLinkEmail error:', error);
    return res.status(500).json({ error: error.message || 'Failed to send upload link email.' });
  }
};

/**
 * POST /api/files/upload
 * Coordinator/Admin multipart file upload handler.
 */
export const handleFileUpload = async (req, res) => {
  try {
    const { batchNumber, fileType, replace } = req.body;
    const file = req.file;

    if (!batchNumber) {
      return res.status(400).json({ error: 'Batch Number is required.' });
    }

    if (!file) {
      return res.status(400).json({ error: 'Please select a file to upload.' });
    }

    const bNum = parseInt(batchNumber, 10);
    const normalizedType = (fileType || (file.originalname.endsWith('.pdf') ? 'REPORT' : 'PPT')).toUpperCase();

    if (normalizedType !== 'REPORT' && normalizedType !== 'PPT') {
      return res.status(400).json({ error: 'Invalid file type. Must be REPORT or PPT.' });
    }

    // Antivirus & Security Scan
    const scanResult = scanFileBuffer(file.buffer, file.originalname);
    if (!scanResult.isClean) {
      return res.status(400).json({
        error: `Antivirus Shield Alert: File rejected! Detected ${scanResult.threatName}`
      });
    }

    // Check if an existing file already exists for this batch
    const existingFile = await getFileFromStorage(bNum, normalizedType);
    const isReplaceConfirmed = replace === 'true' || replace === true;

    if (existingFile && !isReplaceConfirmed) {
      return res.status(409).json({
        conflict: true,
        message: `${normalizedType === 'REPORT' ? 'Report' : 'Presentation'} already uploaded. Replace existing ${normalizedType.toLowerCase()}?`,
        existingFile: {
          fileName: existingFile.file_name,
          fileSize: existingFile.file_size,
          uploadedAt: existingFile.uploaded_at
        }
      });
    }

    // Save directly to MySQL as BLOB (with resilient fallback)
    const saved = await saveFileToStorage({
      batchNumber: bNum,
      fileType: normalizedType,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      buffer: file.buffer
    });

    // Update PSMS_PROJECTS table to reflect uploaded status
    const db = getLocalDatabase();
    if (db && db.projects) {
      const proj = db.projects.find(p => Number(p.batch_number) === Number(bNum));
      if (proj) {
        if (normalizedType === 'REPORT') {
          proj.report_uploaded = 1;
          proj.report_url = `/api/files/report/${bNum}`;
        } else {
          proj.ppt_uploaded = 1;
          proj.ppt_url = `/api/files/ppt/${bNum}`;
        }
        saveLocalDatabase(db);
      }
    }

    return res.json({
      success: true,
      message: `${normalizedType === 'REPORT' ? 'Project Report PDF' : 'Presentation Slides'} uploaded and stored securely in MySQL.`,
      file: saved
    });
  } catch (error) {
    console.error('[FileUploadController] Upload error:', error);
    return res.status(500).json({ error: error.message || 'File upload failed.' });
  }
};

/**
 * GET /api/files/report/:batchNumber
 * Serves stored PDF BLOB inline for viewing.
 * Verifies that the requested report belongs to the batch requested.
 */
export const serveReportPdf = async (req, res) => {
  try {
    const { batchNumber } = req.params;
    const bNum = parseInt(batchNumber, 10);

    const file = await getFileFromStorage(bNum, 'REPORT');
    if (!file || !file.buffer) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Report Not Found - StudyPulse AI</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 60px; background: #f8fafc;">
          <h2 style="color: #1e3fa6;">Project Report Not Found</h2>
          <p style="color: #64748b;">No report PDF has been uploaded yet for Batch ${bNum}.</p>
        </body>
        </html>
      `);
    }

    // Ensure the file belongs to this exact batch
    if (Number(file.batch_number) !== bNum) {
      return res.status(403).send('Access Denied: Requested file does not belong to this batch.');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.file_name || `batch_${bNum}_report.pdf`)}"`);
    res.setHeader('Content-Length', file.buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(file.buffer);
  } catch (error) {
    console.error('[FileUploadController] Serve Report error:', error);
    return res.status(500).send('Error serving report PDF');
  }
};

/**
 * GET /api/files/ppt/:batchNumber
 * Serves stored PPT/PPTX BLOB for download.
 * Verifies that the requested presentation belongs to the batch requested.
 */
export const servePptFile = async (req, res) => {
  try {
    const { batchNumber } = req.params;
    const bNum = parseInt(batchNumber, 10);

    const file = await getFileFromStorage(bNum, 'PPT');
    if (!file || !file.buffer) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>PPT Not Found - StudyPulse AI</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 60px; background: #f8fafc;">
          <h2 style="color: #1e3fa6;">Presentation Not Found</h2>
          <p style="color: #64748b;">No presentation file has been uploaded yet for Batch ${bNum}.</p>
        </body>
        </html>
      `);
    }

    // Ensure the file belongs to this exact batch
    if (Number(file.batch_number) !== bNum) {
      return res.status(403).send('Access Denied: Requested file does not belong to this batch.');
    }

    const mime = file.mime_type || (file.file_name.endsWith('.ppt') ? 'application/vnd.ms-powerpoint' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.file_name || `batch_${bNum}_presentation.pptx`)}"`);
    res.setHeader('Content-Length', file.buffer.length);
    return res.send(file.buffer);
  } catch (error) {
    console.error('[FileUploadController] Serve PPT error:', error);
    return res.status(500).send('Error serving presentation file');
  }
};

/**
 * POST /api/files/verify or PATCH /api/files/:batchNumber/verify
 * Verifies submitted files and updates verification timestamp & coordinator info.
 */
export const verifyFileUpload = async (req, res) => {
  try {
    const batchNumber = req.params.batchNumber || req.body.batchNumber;
    const { fileType = 'ALL', publicationStatus, verifiedBy = 'Project Coordinator' } = req.body;

    if (!batchNumber) {
      return res.status(400).json({ error: 'Batch Number is required.' });
    }

    const bNum = parseInt(batchNumber, 10);

    // Verify in storage
    await setFileVerified(bNum, fileType, verifiedBy);

    // Sync publication status to Project table if provided
    const db = getLocalDatabase();
    if (db && db.projects) {
      const proj = db.projects.find(p => Number(p.batch_number) === Number(bNum));
      if (proj && publicationStatus) {
        proj.publication_status = publicationStatus;
        saveLocalDatabase(db);
      }
    }

    return res.json({
      success: true,
      message: `Batch ${bNum} project files successfully verified by ${verifiedBy}.`,
      batchNumber: bNum,
      verified: true,
      verifiedAt: new Date().toISOString(),
      verifiedBy
    });
  } catch (error) {
    console.error('[FileUploadController] Verify error:', error);
    return res.status(500).json({ error: 'Failed to verify file upload.' });
  }
};

/**
 * POST /api/files/notify or POST /api/files/:batchNumber/notify
 * Sends email notification to Assigned Supervisor and Students of that batch.
 * Contains the VERIFIED file link.
 */
export const notifySupervisorAndStudents = async (req, res) => {
  try {
    const batchNumber = req.params.batchNumber || req.body.batchNumber;
    const { forceResend = false } = req.body;

    if (!batchNumber) {
      return res.status(400).json({ error: 'Batch Number is required.' });
    }

    const bNum = parseInt(batchNumber, 10);
    const db = getLocalDatabase();
    if (!db) {
      return res.status(500).json({ error: 'Database access failure.' });
    }

    // Get team, students, supervisor, and project
    const batchStudents = (db.students || []).filter(s => Number(s.batch_number) === Number(bNum));
    const project = (db.projects || []).find(p => Number(p.batch_number) === Number(bNum));
    const supervisor = (db.mentors || []).find(m => project && m.mentor_roll_number === project.mentor_roll_number) ||
                       (batchStudents[0] ? (db.mentors || []).find(m => m.mentor_roll_number === batchStudents[0].mentor_roll_number) : null) ||
                       (db.mentors && db.mentors[0]);

    const projectTitle = project?.project_title || `Batch ${bNum} Final Year Project`;
    const studentNames = batchStudents.map(s => s.name).join(', ') || 'Assigned Batch Students';

    const reportFile = await getFileFromStorage(bNum, 'REPORT');
    const pptFile = await getFileFromStorage(bNum, 'PPT');

    // Duplicate notification check
    if (!forceResend) {
      const isAlreadyNotified = (reportFile && reportFile.supervisor_notified) || (pptFile && pptFile.supervisor_notified);
      if (isAlreadyNotified) {
        return res.status(400).json({
          success: false,
          alreadyNotified: true,
          message: `Email notification was already dispatched for Batch ${bNum}. Select 'Resend' to force sending.`
        });
      }
    }

    // Prepare email content
    const appUrl = env.APP_URL || `${req.protocol}://${req.get('host')}` || 'http://localhost:3000';
    const reportLink = `${appUrl}/api/files/report/${bNum}`;
    const pptLink = pptFile ? `${appUrl}/api/files/ppt/${bNum}` : null;

    const emailSubject = `StudyPulse AI — Project Report Verified — Batch ${bNum}`;
    
    const plainTextBody = `
StudyPulse AI - Final Year Project Supervision Notification

Project Title: ${projectTitle}
Batch Number: ${bNum}
Students: ${studentNames}
Report Status: Verified
Report Link: ${reportLink}
${pptLink ? `Presentation Link: ${pptLink}` : ''}
Publication Status: ${project?.publication_status || 'Submitted'}

The Project Coordinator has reviewed and verified the project submission for your team.

Regards,
StudyPulse AI
Project Supervision System
`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e3fa6; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px;">StudyPulse AI — Project Files Verified</h2>
          <p style="color: #93c5fd; margin: 6px 0 0 0; font-size: 13px;">Official Academic Supervision Portal</p>
        </div>

        <div style="padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 15px; margin-top: 0;">Hello,</p>
          <p style="font-size: 14px;">The project documentation submitted for <strong>Batch ${bNum}</strong> has been officially reviewed and <strong>Verified</strong>.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
            <tr>
              <td style="padding: 10px 14px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569; width: 35%;">Project Title:</td>
              <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${projectTitle}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569;">Batch Number:</td>
              <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #1e3fa6; font-weight: bold;">Batch ${bNum}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569;">Students:</td>
              <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${studentNames}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569;">Report PDF:</td>
              <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #059669; font-weight: bold;">✓ Verified</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569;">Verified Link:</td>
              <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">
                <a href="${reportLink}" style="color: #1e3fa6; font-weight: bold; text-decoration: underline;" target="_blank">
                  Open Project Report (${reportFile ? reportFile.file_name : `projectreport.${bNum}`})
                </a>
              </td>
            </tr>
            ${pptLink ? `
            <tr>
              <td style="padding: 10px 14px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #475569;">Presentation:</td>
              <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">
                <a href="${pptLink}" style="color: #1e3fa6; font-weight: bold; text-decoration: underline;" target="_blank">Download Presentation</a>
              </td>
            </tr>` : ''}
            <tr>
              <td style="padding: 10px 14px; font-weight: bold; color: #475569;">Publication Status:</td>
              <td style="padding: 10px 14px; color: #0f172a;">${project?.publication_status || 'Submitted'}</td>
            </tr>
          </table>

          <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
            This email was generated automatically by StudyPulse AI Academic Portal.<br>
            <strong>Project Coordinator Office</strong>
          </p>
        </div>
      </div>
    `;

    const dispatchedEmails = [];
    const dispatchErrors = [];

    // 1. Send to Assigned Supervisor
    if (supervisor && isValidEmail(supervisor.email)) {
      try {
        const resSup = await sendEmail({
          to: supervisor.email,
          subject: emailSubject,
          text: plainTextBody,
          html: buildStudyPulseEmailTemplate(emailSubject, plainTextBody, htmlBody)
        });
        dispatchedEmails.push({ recipient: supervisor.email, role: 'Supervisor', success: resSup.success });
      } catch (err) {
        dispatchErrors.push({ recipient: supervisor.email, role: 'Supervisor', error: err.message });
      }
    }

    // 2. Send to Students of this batch
    for (const student of batchStudents) {
      if (student && isValidEmail(student.email)) {
        try {
          const resStu = await sendEmail({
            to: student.email,
            subject: emailSubject,
            text: plainTextBody,
            html: buildStudyPulseEmailTemplate(emailSubject, plainTextBody, htmlBody)
          });
          dispatchedEmails.push({ recipient: student.email, role: `Student (${student.name})`, success: resStu.success });
        } catch (err) {
          dispatchErrors.push({ recipient: student.email, role: `Student (${student.name})`, error: err.message });
        }
      }
    }

    // Mark notification sent state in database
    await setNotificationSent(bNum, 'ALL');

    return res.json({
      success: dispatchedEmails.length > 0 || dispatchErrors.length === 0,
      message: `Verified report notification dispatched to ${dispatchedEmails.length} recipient(s).`,
      dispatchedEmails,
      dispatchErrors,
      notificationSentAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[FileUploadController] Notify error:', error);
    return res.status(500).json({ error: 'Failed to dispatch email notifications: ' + error.message });
  }
};

/**
 * PATCH /api/files/publication-status
 * Update publication status across projects
 */
export const updatePublicationStatus = async (req, res) => {
  try {
    const { batchNumber, publicationStatus } = req.body;
    if (!batchNumber || !publicationStatus) {
      return res.status(400).json({ error: 'batchNumber and publicationStatus are required.' });
    }

    const bNum = parseInt(batchNumber, 10);
    const db = getLocalDatabase();
    if (db && db.projects) {
      const proj = db.projects.find(p => Number(p.batch_number) === Number(bNum));
      if (proj) {
        proj.publication_status = publicationStatus;
        saveLocalDatabase(db);
      }
    }

    return res.json({
      success: true,
      batchNumber: bNum,
      publicationStatus
    });
  } catch (error) {
    console.error('[FileUploadController] Update pub status error:', error);
    return res.status(500).json({ error: 'Failed to update publication status' });
  }
};

/**
 * GET /api/files/team/:batchNumber
 */
export const getTeamFiles = async (req, res) => {
  try {
    const { batchNumber } = req.params;
    const bNum = parseInt(batchNumber, 10);
    const files = await getAllFilesMetadata();
    const teamFiles = files.filter(f => Number(f.batch_number) === bNum);
    return res.json({
      batchNumber: bNum,
      files: teamFiles
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get team files' });
  }
};

/**
 * POST /api/files/clear-all-data or /api/students/clear-all-data
 * Completely clears:
 * - Student details
 * - Team/batch information
 * - Project details associated with those students
 * - Uploaded Report PDFs and PPT files (including MySQL BLOBs)
 * - File metadata
 * - Student upload links/tokens
 * - Related file verification & notification records
 * 
 * Preserves:
 * - Admin accounts & profiles
 * - App settings & authentication
 * - Faculty mentors/supervisors
 * - Message templates & firewall security alerts
 */
export const clearAllStudentData = async (req, res) => {
  try {
    // 1. MySQL Clean up (BLOB storage & upload links)
    await clearAllFilesAndStorage();

    // 2. Oracle Clean up (if Oracle DB is connected, in proper relational order)
    try {
      const status = getOracleStatus();
      if (status && status.connected) {
        await executeSQL('DELETE FROM PSMS_REVIEWS');
        await executeSQL('DELETE FROM PSMS_PROJECTS');
        await executeSQL('DELETE FROM PSMS_STUDENTS');
      }
    } catch (oracleErr) {
      console.warn('[Clear All Data] Oracle DB deletion notice:', oracleErr.message);
    }

    // 3. Local persistent store cleanup (psms_database.json)
    const db = getLocalDatabase();
    if (db) {
      db.students = [];
      db.teams = [];
      db.projects = [];
      db.reviews = [];
      db.files = [];
      db.upload_links = [];
      db.fileUploads = [];

      // Clean notifications related to students/reviews/files, preserve security alerts and admin notes
      if (Array.isArray(db.notifications)) {
        db.notifications = db.notifications.filter(n => 
          n.type !== 'review' && 
          n.type !== 'file' && 
          n.type !== 'upload' &&
          !n.title?.toLowerCase().includes('review') &&
          !n.title?.toLowerCase().includes('batch')
        );
      }

      saveLocalDatabase(db);
    }

    console.log('[Admin Action] Successfully cleared all student, team, project, review, and file data.');

    return res.json({
      success: true,
      message: 'All student data cleared successfully.'
    });
  } catch (error) {
    console.error('Error in clearAllStudentData:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to clear student data: ' + error.message
    });
  }
};

export default {
  getFileUploads,
  getStudentUploadInfo,
  handleStudentUpload,
  sendStudentUploadLinkEmail,
  handleFileUpload,
  serveReportPdf,
  servePptFile,
  verifyFileUpload,
  notifySupervisorAndStudents,
  updatePublicationStatus,
  getTeamFiles,
  uploadMiddleware,
  studentUploadMiddleware,
  clearAllStudentData
};
