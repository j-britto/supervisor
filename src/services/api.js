// API Service for PSMS Frontend communication with backend server

const API_BASE = '/api';

/**
 * Robust JSON fetch wrapper that guards against HTML fallback pages and unexpected token syntax errors
 */
async function safeFetchJson(url, options = {}, defaultVal = null) {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      const text = await res.text();
      return defaultVal !== null ? defaultVal : { success: false, error: `Server returned non-JSON response (${res.status})`, rawText: text.substring(0, 100) };
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error(`[API Fetch Error: ${url}]:`, err.message);
    return defaultVal !== null ? defaultVal : { success: false, error: err.message };
  }
}

export const api = {
  // Auth
  getAdmins: async () => {
    return safeFetchJson(`${API_BASE}/auth/admins`, {}, { total: 0, admins: [] });
  },

  signup: async (data) => {
    return safeFetchJson(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },
  
  sendOtp: async (destination) => {
    return safeFetchJson(`${API_BASE}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination })
    });
  },

  verifyOtp: async (destination, otp) => {
    return safeFetchJson(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination, otp })
    });
  },

  forgotPasswordSendOtp: async (email) => {
    return safeFetchJson(`${API_BASE}/auth/forgot-password/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
  },

  forgotPasswordVerifyOtp: async (email, otp, newPassword = null) => {
    return safeFetchJson(`${API_BASE}/auth/forgot-password/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword })
    });
  },

  login: async (username, password) => {
    return safeFetchJson(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
  },

  // Settings & Profile
  getProfileSettings: async () => {
    const primary = await safeFetchJson(`${API_BASE}/settings/profile`, {}, null);
    if (primary && (primary.admin || primary.admins || primary.settings)) {
      return primary;
    }
    const fallback = await safeFetchJson(`${API_BASE}/auth/profile`, {}, {});
    return fallback || {};
  },

  updateProfileSettings: async (data) => {
    const primary = await safeFetchJson(`${API_BASE}/settings/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }, null);
    if (primary && primary.success) {
      return primary;
    }
    return safeFetchJson(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  // Messages
  getMessageTemplates: async () => {
    return safeFetchJson(`${API_BASE}/settings/messages`, {}, []);
  },

  createMessageTemplate: async (data) => {
    return safeFetchJson(`${API_BASE}/settings/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  updateMessageTemplate: async (id, data) => {
    return safeFetchJson(`${API_BASE}/settings/messages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  deleteMessageTemplate: async (id) => {
    return safeFetchJson(`${API_BASE}/settings/messages/${id}`, {
      method: 'DELETE'
    });
  },

  // Mentors
  getMentors: async () => {
    const data = await safeFetchJson(`${API_BASE}/mentors`, {}, []);
    return Array.isArray(data) ? data : [];
  },

  createMentor: async (data) => {
    return safeFetchJson(`${API_BASE}/mentors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  updateMentor: async (id, data) => {
    return safeFetchJson(`${API_BASE}/mentors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  deleteMentor: async (id) => {
    return safeFetchJson(`${API_BASE}/mentors/${id}`, {
      method: 'DELETE'
    });
  },

  // Students
  getStudents: async () => {
    const data = await safeFetchJson(`${API_BASE}/students`, {}, []);
    return Array.isArray(data) ? data : [];
  },

  createStudent: async (data) => {
    return safeFetchJson(`${API_BASE}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  updateStudent: async (id, data) => {
    return safeFetchJson(`${API_BASE}/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  deleteStudent: async (id) => {
    return safeFetchJson(`${API_BASE}/students/${id}`, {
      method: 'DELETE'
    });
  },

  // Projects
  getProjects: async () => {
    const data = await safeFetchJson(`${API_BASE}/projects`, {}, []);
    return Array.isArray(data) ? data : [];
  },

  createProject: async (data) => {
    return safeFetchJson(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  updateProject: async (id, data) => {
    return safeFetchJson(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  deleteProject: async (id) => {
    return safeFetchJson(`${API_BASE}/projects/${id}`, {
      method: 'DELETE'
    });
  },

  // Teams
  getTeams: async () => {
    const data = await safeFetchJson(`${API_BASE}/teams`, {}, []);
    return Array.isArray(data) ? data : [];
  },

  createTeam: async (data) => {
    return safeFetchJson(`${API_BASE}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  // Reviews
  getReviews: async () => {
    const data = await safeFetchJson(`${API_BASE}/reviews`, {}, []);
    return Array.isArray(data) ? data : [];
  },

  saveReview: async (data) => {
    return safeFetchJson(`${API_BASE}/reviews/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  createOrUpdateReview: async (data) => {
    return safeFetchJson(`${API_BASE}/reviews/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  updateReview: async (id, data) => {
    return safeFetchJson(`${API_BASE}/reviews/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  batchSaveReviews: async (reviews) => {
    return safeFetchJson(`${API_BASE}/reviews/batch-save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviews })
    });
  },

  // Final Report
  getFinalReport: async (studentRegisterNumber) => {
    return safeFetchJson(`${API_BASE}/reports/final/${studentRegisterNumber}`, {}, null);
  },

  // Notifications
  getNotifications: async () => {
    const data = await safeFetchJson(`${API_BASE}/notifications`, {}, []);
    return Array.isArray(data) ? data : [];
  },

  markNotificationsRead: async () => {
    return safeFetchJson(`${API_BASE}/notifications/read-all`, {
      method: 'PUT'
    });
  },

  // RAG Query
  queryRAG: async (queryText) => {
    return safeFetchJson(`${API_BASE}/rag/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: queryText })
    });
  },

  // Email System
  sendEmail: async ({ to, subject, text, message, html }) => {
    const res = await fetch(`${API_BASE}/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        subject,
        text: text || message || '',
        html
      })
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Server returned non-JSON response (${res.status})`);
    }
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || data.error || 'Failed to send email');
    }
    return data;
  },

  getEmailStatus: async () => {
    return safeFetchJson(`${API_BASE}/email/status`, {}, {});
  },

  // File Uploads & Link Verification
  getFileUploads: async () => {
    const data = await safeFetchJson(`${API_BASE}/files`, {}, []);
    return Array.isArray(data) ? data : [];
  },

  getStudentUploadInfo: async (batchNumber, token) => {
    const res = await fetch(`${API_BASE}/files/upload-info/${batchNumber}/${token}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to load upload session.');
    }
    return data;
  },

  submitStudentFiles: async (batchNumber, token, formData) => {
    const res = await fetch(`${API_BASE}/files/student-upload/${batchNumber}/${token}`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Submission failed.');
    }
    return data;
  },

  sendStudentUploadLink: async (batchNumber, forceResend = false) => {
    const res = await fetch(`${API_BASE}/files/send-upload-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchNumber, forceResend })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || 'Failed to send upload link email');
    }
    return data;
  },

  uploadFile: async (formData) => {
    const res = await fetch(`${API_BASE}/files/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 409 && data.conflict) {
        return data; // Return conflict object for user confirmation
      }
      throw new Error(data.error || 'File upload failed');
    }
    return data;
  },

  verifyFileUpload: async (data) => {
    return safeFetchJson(`${API_BASE}/files/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  notifyFileVerification: async (data) => {
    const res = await fetch(`${API_BASE}/files/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || result.message || 'Notification dispatch failed');
    }
    return result;
  },

  updatePublicationStatus: async (batchNumber, publicationStatus) => {
    return safeFetchJson(`${API_BASE}/files/publication-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchNumber, publicationStatus })
    });
  },

  getTeamFiles: async (batchNumber) => {
    return safeFetchJson(`${API_BASE}/files/team/${batchNumber}`, {}, { files: [] });
  },

  clearAllStudentData: async () => {
    return safeFetchJson(`${API_BASE}/files/clear-all-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  },

  // Security & 4-Layer Firewall
  getSecurityStatus: async () => {
    return safeFetchJson(`${API_BASE}/security/status`, {}, {});
  },

  runSecurityScan: async (payload, context = 'User manual scan') => {
    return safeFetchJson(`${API_BASE}/security/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload, context })
    });
  },

  triggerTestSecurityAlert: async () => {
    return safeFetchJson(`${API_BASE}/security/test-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

