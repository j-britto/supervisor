import { getLocalDatabase, saveLocalDatabase } from '../helpers/dbHelper.js';
import { sendEmail } from '../services/emailService.js';
import { verifyTransporter } from '../services/emailService.js';

// Helper to ensure admins array exists and has initial defaults
function ensureAdmins(db) {
  if (!db.admins || !Array.isArray(db.admins) || db.admins.length === 0) {
    db.admins = [
      {
        id: 'adm_1',
        username: 'admin_vasanthi',
        phone: '9876543210',
        userId: 'STF-VAS-01',
        email: 'vasanthi@studypulse.edu',
        password: 'password123',
        profileImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        role: 'admin',
        createdAt: '2026-09-01T08:00:00.000Z'
      },
      {
        id: 'adm_2',
        username: 'ramya',
        phone: '9876543000',
        userId: '23CS1490',
        email: 'rajgovindha165@gmail.com',
        password: '123456',
        profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: 'admin',
        createdAt: '2026-09-02T08:00:00.000Z'
      }
    ];
  }
  // Ensure legacy db.admin points to first admin
  if (!db.admin) {
    db.admin = { ...db.admins[0] };
  }
  return db.admins;
}

export const getAdmins = (req, res) => {
  const db = getLocalDatabase();
  const admins = ensureAdmins(db);
  // Return safe view without raw password
  const safeAdmins = admins.map(a => ({
    id: a.id,
    username: a.username,
    phone: a.phone,
    userId: a.userId,
    email: a.email,
    role: a.role || 'admin',
    profileImage: a.profileImage,
    createdAt: a.createdAt
  }));
  res.json({
    total: safeAdmins.length,
    maxLimit: 2,
    admins: safeAdmins
  });
};

export const signup = (req, res) => {
  const { username, phoneNumber, email, id, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, Email, and Password are required.' });
  }

  // 10 digits validation
  if (!/^\d{10}$/.test(String(phoneNumber).trim())) {
    return res.status(400).json({ error: 'Phone Number must be exactly 10 digits.' });
  }

  const db = getLocalDatabase();
  const admins = ensureAdmins(db);

  // Strict check: Only 2 admins allowed
  if (admins.length >= 2) {
    return res.status(400).json({
      error: 'Registration limit reached: Maximum of 2 administrators are permitted in the system. Slot 2/2 is already filled.'
    });
  }

  // Check duplicate username, email, phone, userId
  const cleanUsername = username.trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = String(phoneNumber).trim();
  const cleanUserId = (id || '').trim().toLowerCase();

  const isDuplicate = admins.some(a =>
    a.username.toLowerCase() === cleanUsername ||
    a.email.toLowerCase() === cleanEmail ||
    a.phone === cleanPhone ||
    (cleanUserId && a.userId && a.userId.toLowerCase() === cleanUserId)
  );

  if (isDuplicate) {
    return res.status(400).json({
      error: 'An administrator with this username, email, phone number, or Staff Roll ID already exists.'
    });
  }

  const newAdmin = {
    id: 'adm_' + Date.now(),
    username: username.trim(),
    phone: cleanPhone,
    userId: id ? id.trim() : `STF-${Date.now().toString().slice(-4)}`,
    email: email.trim(),
    password: password.trim(),
    profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    role: 'admin',
    createdAt: new Date().toISOString()
  };

  admins.push(newAdmin);
  db.admins = admins;
  db.admin = { ...newAdmin, settings: db.admin?.settings || {} };
  saveLocalDatabase(db);

  res.json({
    success: true,
    message: 'Admin account registered successfully.',
    admin: {
      id: newAdmin.id,
      username: newAdmin.username,
      email: newAdmin.email,
      phone: newAdmin.phone,
      userId: newAdmin.userId,
      profileImage: newAdmin.profileImage
    }
  });
};

export const sendOtp = (req, res) => {
  const { destination } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;

  const db = getLocalDatabase();
  if (!db.otps) db.otps = {};
  db.otps[destination || 'default'] = { otp, expiresAt };
  saveLocalDatabase(db);

  console.log(`[PSMS OTP SERVICE] Sent OTP to ${destination}: ${otp}`);

  if (destination && destination.includes('@')) {
    sendEmail({
      to: destination,
      subject: 'StudyPulse AI — Your Security Verification Code (OTP)',
      text: `Hello,\n\nYour 6-digit verification code for StudyPulse AI is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you did not request this OTP, please ignore this email.`
    }).catch(err => console.warn(`[OTP Email Warning] Could not dispatch OTP email to ${destination}:`, err.message));
  }

  res.json({ success: true, message: `OTP sent to ${destination}. (Demo code: ${otp})`, demoCode: otp });
};

export const verifyOtp = (req, res) => {
  const { destination, otp } = req.body;
  const db = getLocalDatabase();
  const record = db.otps ? db.otps[destination || 'default'] : null;

  if (!record) {
    return res.status(400).json({ error: 'No OTP requested or OTP expired.' });
  }
  if (Date.now() > record.expiresAt) {
    delete db.otps[destination || 'default'];
    saveLocalDatabase(db);
    return res.status(400).json({ error: 'OTP has expired. Please request a new code.' });
  }
  if (record.otp !== (otp || '').trim()) {
    return res.status(400).json({ error: 'Invalid OTP code entered.' });
  }

  delete db.otps[destination || 'default'];
  saveLocalDatabase(db);
  res.json({ success: true, message: 'OTP verified successfully.' });
};

export const forgotPasswordSendOtp = (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Registered Email Address is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const db = getLocalDatabase();
  const admins = ensureAdmins(db);

  const matchedAdmin = admins.find(a => a.email.toLowerCase() === cleanEmail);
  if (!matchedAdmin) {
    return res.status(404).json({
      error: `No administrator account found with email "${email}". Please verify your registered email.`
    });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;

  if (!db.otps) db.otps = {};
  db.otps[cleanEmail] = { otp, expiresAt, adminId: matchedAdmin.id };
  saveLocalDatabase(db);

  console.log(`[PSMS FORGOT PASSWORD OTP] Sent OTP to admin ${matchedAdmin.username} (${cleanEmail}): ${otp}`);

  sendEmail({
    to: cleanEmail,
    subject: 'StudyPulse AI — Password Reset Verification OTP',
    text: `Hello ${matchedAdmin.username},\n\nYour 6-digit OTP to reset your password and access StudyPulse AI is: ${otp}\n\nThis code will expire in 5 minutes.`
  }).catch(err => console.warn(`[OTP Email Warning] Could not dispatch OTP email to ${cleanEmail}:`, err.message));

  res.json({
    success: true,
    message: `OTP sent to ${cleanEmail}. (Demo OTP: ${otp})`,
    demoCode: otp,
    adminName: matchedAdmin.username
  });
};

export const forgotPasswordVerifyOtp = (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const db = getLocalDatabase();
  const record = db.otps ? db.otps[cleanEmail] : null;

  if (!record) {
    return res.status(400).json({ error: 'No OTP requested or OTP has expired.' });
  }
  if (Date.now() > record.expiresAt) {
    delete db.otps[cleanEmail];
    saveLocalDatabase(db);
    return res.status(400).json({ error: 'OTP has expired. Please request a new code.' });
  }
  if (record.otp !== (otp || '').trim()) {
    return res.status(400).json({ error: 'Invalid OTP code entered.' });
  }

  const admins = ensureAdmins(db);
  const matchedAdmin = admins.find(a => a.email.toLowerCase() === cleanEmail);

  if (!matchedAdmin) {
    return res.status(404).json({ error: 'Admin account not found.' });
  }

  // Update password if provided
  if (newPassword && newPassword.trim().length >= 4) {
    matchedAdmin.password = newPassword.trim();
  }

  delete db.otps[cleanEmail];
  saveLocalDatabase(db);

  res.json({
    success: true,
    message: 'OTP verified successfully! Welcome back to StudyPulse AI.',
    admin: {
      id: matchedAdmin.id,
      username: matchedAdmin.username,
      email: matchedAdmin.email,
      phone: matchedAdmin.phone,
      userId: matchedAdmin.userId,
      profileImage: matchedAdmin.profileImage,
      role: 'admin'
    }
  });
};

export const login = (req, res) => {
  const { username, password } = req.body;
  const db = getLocalDatabase();
  const admins = ensureAdmins(db);

  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  const matched = admins.find(a =>
    (a.username.toLowerCase() === cleanUser || a.email.toLowerCase() === cleanUser) &&
    a.password === cleanPass
  );

  if (matched) {
    return res.json({
      success: true,
      admin: {
        id: matched.id,
        username: matched.username,
        email: matched.email,
        phone: matched.phone,
        userId: matched.userId,
        profileImage: matched.profileImage,
        role: 'admin'
      }
    });
  }

  return res.status(401).json({ error: 'Invalid username/email or password.' });
};

export const getProfile = (req, res) => {
  const db = getLocalDatabase();
  const admins = ensureAdmins(db);
  // Return current admin or first admin
  const currentAdmin = admins[0];
  res.json({
    admin: {
      username: currentAdmin.username,
      email: currentAdmin.email,
      phone: currentAdmin.phone,
      userId: currentAdmin.userId,
      profileImage: currentAdmin.profileImage
    },
    admins: admins.map(a => ({
      id: a.id,
      username: a.username,
      email: a.email,
      phone: a.phone,
      userId: a.userId,
      profileImage: a.profileImage,
      role: 'admin'
    })),
    settings: db.admin?.settings || {}
  });
};

export const updateProfile = (req, res) => {
  const { admin, settings } = req.body;
  const db = getLocalDatabase();
  const admins = ensureAdmins(db);

  if (admin) {
    const idx = admins.findIndex(a => a.username === admin.username || a.email === admin.email || a.id === admin.id);
    if (idx !== -1) {
      admins[idx] = { ...admins[idx], ...admin };
    } else {
      admins[0] = { ...admins[0], ...admin };
    }
    db.admins = admins;
    db.admin = { ...admins[0], ...admin };
  }

  if (settings) {
    if (!db.admin) db.admin = {};
    db.admin.settings = { ...db.admin.settings, ...settings };
    if (settings.emailId) {
      process.env.EMAIL_USER = settings.emailId;
    }
    if (settings.emailAppId) {
      process.env.EMAIL_APP_PASSWORD = settings.emailAppId;
    }
    verifyTransporter().catch(err => console.warn('Transporter re-verify notice:', err.message));
  }

  saveLocalDatabase(db);
  res.json({ success: true, message: 'Profile settings saved successfully.' });
};

export default {
  getAdmins,
  signup,
  sendOtp,
  verifyOtp,
  forgotPasswordSendOtp,
  forgotPasswordVerifyOtp,
  login,
  getProfile,
  updateProfile
};

