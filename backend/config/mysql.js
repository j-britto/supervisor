import crypto from 'crypto';
import mysql from 'mysql2/promise';
import { getLocalDatabase, saveLocalDatabase } from '../helpers/dbHelper.js';

let mysqlPool = null;
let isConnected = false;

export const getMySQLConfig = () => ({
  host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '3306', 10),
  user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'studypulse',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  maxAllowedPacket: 67108864 // 64MB for large BLOBs
});

/**
 * Generate a cryptographically secure random token for student file uploads
 */
export function generateSecureToken() {
  return crypto.randomBytes(20).toString('hex');
}

/**
 * Initialize MySQL Connection Pool and ensure files table exists
 */
export async function initializeMySQLPool() {
  const config = getMySQLConfig();
  
  try {
    // First attempt to connect without database to ensure database exists if permitted
    const serverConnection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      connectTimeout: 3000
    });

    await serverConnection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await serverConnection.end();

    // Now establish connection pool with database selected
    mysqlPool = mysql.createPool(config);

    // Verify connection
    const testConn = await mysqlPool.getConnection();
    testConn.release();

    // Create files table with BLOB column for PDF/PPT storage
    const createFilesTableSQL = `
      CREATE TABLE IF NOT EXISTS files (
        id VARCHAR(50) PRIMARY KEY,
        batch_number INT NOT NULL,
        file_type VARCHAR(20) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size INT NOT NULL,
        file_data LONGBLOB NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verified TINYINT(1) DEFAULT 0,
        verified_at TIMESTAMP NULL,
        verified_by VARCHAR(100) NULL,
        supervisor_notified TINYINT(1) DEFAULT 0,
        students_notified TINYINT(1) DEFAULT 0,
        notification_sent_at TIMESTAMP NULL,
        UNIQUE KEY uk_batch_file_type (batch_number, file_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await mysqlPool.query(createFilesTableSQL);

    // Create upload_links table for student-specific upload links with cryptographically secure tokens
    const createUploadLinksTableSQL = `
      CREATE TABLE IF NOT EXISTS upload_links (
        id VARCHAR(50) PRIMARY KEY,
        batch_number INT NOT NULL UNIQUE,
        token VARCHAR(100) NOT NULL UNIQUE,
        expires_at TIMESTAMP NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        upload_link_sent TINYINT(1) DEFAULT 0,
        upload_link_sent_at TIMESTAMP NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await mysqlPool.query(createUploadLinksTableSQL);

    isConnected = true;
    console.log(`[MySQL Engine] ✅ Connected to Oracle MySQL at ${config.host}:${config.port}/${config.database}`);
    console.log(`[MySQL Engine] ✅ 'files' & 'upload_links' tables verified.`);
    return mysqlPool;
  } catch (error) {
    isConnected = false;
    console.warn(`[MySQL Engine] ℹ️  Notice: MySQL not connected (${error.message}). Activating local BLOB storage sync.`);
    return null;
  }
}

export function isMySQLConnected() {
  return isConnected && mysqlPool !== null;
}

/**
 * Save or replace uploaded PDF/PPT BLOB directly in MySQL
 */
export async function saveFileToStorage({
  id,
  batchNumber,
  fileType, // 'REPORT' or 'PPT'
  fileName,
  mimeType,
  fileSize,
  buffer
}) {
  const bNum = parseInt(batchNumber, 10);
  const fileId = id || `file_${bNum}_${fileType.toLowerCase()}_${Date.now()}`;
  const now = new Date();

  let savedInMySQL = false;

  if (isMySQLConnected()) {
    try {
      const sql = `
        INSERT INTO files (
          id, batch_number, file_type, file_name, mime_type, file_size, file_data,
          uploaded_at, verified, verified_at, verified_by, supervisor_notified, students_notified, notification_sent_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 0, NULL, NULL, 0, 0, NULL)
        ON DUPLICATE KEY UPDATE
          file_name = VALUES(file_name),
          mime_type = VALUES(mime_type),
          file_size = VALUES(file_size),
          file_data = VALUES(file_data),
          uploaded_at = CURRENT_TIMESTAMP,
          verified = 0,
          verified_at = NULL,
          verified_by = NULL,
          supervisor_notified = 0,
          students_notified = 0,
          notification_sent_at = NULL;
      `;
      await mysqlPool.query(sql, [fileId, bNum, fileType, fileName, mimeType, fileSize, buffer]);
      savedInMySQL = true;
      console.log(`[MySQL BLOB] Stored ${fileType} for Batch ${bNum} (${fileSize} bytes) in MySQL.`);
    } catch (dbErr) {
      console.error('[MySQL BLOB Error] Failed saving to MySQL, using local fallback:', dbErr.message);
    }
  }

  // Always keep local database in sync as resilient backup
  try {
    const localDb = getLocalDatabase();
    if (localDb) {
      if (!localDb.files) localDb.files = [];
      const base64Data = buffer.toString('base64');

      const existingIndex = localDb.files.findIndex(f => 
        String(f.batch_number) === String(bNum) && f.file_type === fileType
      );

      const record = {
        id: fileId,
        batch_number: bNum,
        file_type: fileType,
        file_name: fileName,
        mime_type: mimeType,
        file_size: fileSize,
        file_data_base64: base64Data,
        uploaded_at: now.toISOString(),
        verified: 0,
        verified_at: null,
        verified_by: null,
        supervisor_notified: 0,
        students_notified: 0,
        notification_sent_at: null
      };

      if (existingIndex >= 0) {
        localDb.files[existingIndex] = record;
      } else {
        localDb.files.push(record);
      }
      saveLocalDatabase(localDb);
    }
  } catch (syncErr) {
    console.error('[Local Sync Error]:', syncErr.message);
  }

  return {
    id: fileId,
    batch_number: bNum,
    file_type: fileType,
    file_name: fileName,
    mime_type: mimeType,
    file_size: fileSize,
    uploaded_at: now.toISOString(),
    verified: 0,
    savedInMySQL
  };
}

/**
 * Retrieve file BLOB from MySQL or local sync
 */
export async function getFileFromStorage(batchNumber, fileType) {
  const bNum = parseInt(batchNumber, 10);

  if (isMySQLConnected()) {
    try {
      const [rows] = await mysqlPool.query(
        `SELECT id, batch_number, file_type, file_name, mime_type, file_size, file_data, uploaded_at, verified, verified_at, verified_by
         FROM files WHERE batch_number = ? AND file_type = ? LIMIT 1`,
        [bNum, fileType]
      );

      if (rows && rows.length > 0) {
        const row = rows[0];
        return {
          id: row.id,
          batch_number: row.batch_number,
          file_type: row.file_type,
          file_name: row.file_name,
          mime_type: row.mime_type,
          file_size: row.file_size,
          buffer: Buffer.from(row.file_data),
          uploaded_at: row.uploaded_at,
          verified: Boolean(row.verified),
          verified_at: row.verified_at,
          verified_by: row.verified_by
        };
      }
    } catch (dbErr) {
      console.error('[MySQL Get Error] Error reading from MySQL:', dbErr.message);
    }
  }

  // Fallback to local sync
  const localDb = getLocalDatabase();
  if (localDb && localDb.files) {
    const file = localDb.files.find(f => 
      String(f.batch_number) === String(bNum) && f.file_type === fileType
    );
    if (file) {
      return {
        id: file.id,
        batch_number: file.batch_number,
        file_type: file.file_type,
        file_name: file.file_name,
        mime_type: file.mime_type,
        file_size: file.file_size,
        buffer: Buffer.from(file.file_data_base64 || '', 'base64'),
        uploaded_at: file.uploaded_at,
        verified: Boolean(file.verified),
        verified_at: file.verified_at,
        verified_by: file.verified_by
      };
    }
  }

  return null;
}

/**
 * Get all files metadata (without heavy BLOB data)
 */
export async function getAllFilesMetadata() {
  const metaMap = new Map();

  // 1. Get from local sync first
  const localDb = getLocalDatabase();
  if (localDb && localDb.files) {
    localDb.files.forEach(f => {
      const key = `${f.batch_number}_${f.file_type}`;
      metaMap.set(key, {
        id: f.id,
        batch_number: f.batch_number,
        file_type: f.file_type,
        file_name: f.file_name,
        mime_type: f.mime_type,
        file_size: f.file_size,
        uploaded_at: f.uploaded_at,
        verified: Boolean(f.verified),
        verified_at: f.verified_at,
        verified_by: f.verified_by,
        supervisor_notified: Boolean(f.supervisor_notified),
        students_notified: Boolean(f.students_notified),
        notification_sent_at: f.notification_sent_at
      });
    });
  }

  // 2. Overlay MySQL records if available
  if (isMySQLConnected()) {
    try {
      const [rows] = await mysqlPool.query(
        `SELECT id, batch_number, file_type, file_name, mime_type, file_size, uploaded_at, verified, verified_at, verified_by, supervisor_notified, students_notified, notification_sent_at FROM files`
      );
      if (rows && rows.length > 0) {
        rows.forEach(r => {
          const key = `${r.batch_number}_${r.file_type}`;
          metaMap.set(key, {
            id: r.id,
            batch_number: r.batch_number,
            file_type: r.file_type,
            file_name: r.file_name,
            mime_type: r.mime_type,
            file_size: r.file_size,
            uploaded_at: r.uploaded_at,
            verified: Boolean(r.verified),
            verified_at: r.verified_at,
            verified_by: r.verified_by,
            supervisor_notified: Boolean(r.supervisor_notified),
            students_notified: Boolean(r.students_notified),
            notification_sent_at: r.notification_sent_at
          });
        });
      }
    } catch (e) {
      console.warn('[MySQL Meta Notice]:', e.message);
    }
  }

  return Array.from(metaMap.values());
}

/**
 * Verify file in MySQL and local storage
 */
export async function setFileVerified(batchNumber, fileType = 'REPORT', verifiedBy = 'Project Coordinator') {
  const bNum = parseInt(batchNumber, 10);
  const now = new Date();

  if (isMySQLConnected()) {
    try {
      await mysqlPool.query(
        `UPDATE files SET verified = 1, verified_at = CURRENT_TIMESTAMP, verified_by = ? WHERE batch_number = ? AND (file_type = ? OR ? = 'ALL')`,
        [verifiedBy, bNum, fileType, fileType]
      );
    } catch (e) {
      console.error('[MySQL Verify Error]:', e.message);
    }
  }

  // Update local sync
  const localDb = getLocalDatabase();
  if (localDb && localDb.files) {
    localDb.files.forEach(f => {
      if (String(f.batch_number) === String(bNum) && (fileType === 'ALL' || f.file_type === fileType)) {
        f.verified = 1;
        f.verified_at = now.toISOString();
        f.verified_by = verifiedBy;
      }
    });
    saveLocalDatabase(localDb);
  }

  return true;
}

/**
 * Mark notification sent in MySQL and local storage
 */
export async function setNotificationSent(batchNumber, fileType = 'ALL') {
  const bNum = parseInt(batchNumber, 10);
  const now = new Date();

  if (isMySQLConnected()) {
    try {
      await mysqlPool.query(
        `UPDATE files SET supervisor_notified = 1, students_notified = 1, notification_sent_at = CURRENT_TIMESTAMP WHERE batch_number = ? AND (file_type = ? OR ? = 'ALL')`,
        [bNum, fileType, fileType]
      );
    } catch (e) {
      console.error('[MySQL Notify Error]:', e.message);
    }
  }

  // Update local sync
  const localDb = getLocalDatabase();
  if (localDb && localDb.files) {
    localDb.files.forEach(f => {
      if (String(f.batch_number) === String(bNum) && (fileType === 'ALL' || f.file_type === fileType)) {
        f.supervisor_notified = 1;
        f.students_notified = 1;
        f.notification_sent_at = now.toISOString();
      }
    });
    saveLocalDatabase(localDb);
  }

  return true;
}

/**
 * Retrieve or generate a secure upload link for a batch
 */
export async function getOrCreateUploadLink(batchNumber) {
  const bNum = parseInt(batchNumber, 10);
  const now = new Date();

  // Check MySQL first if connected
  if (isMySQLConnected()) {
    try {
      const [rows] = await mysqlPool.query(
        'SELECT * FROM upload_links WHERE batch_number = ? AND is_active = 1 LIMIT 1',
        [bNum]
      );
      if (rows && rows.length > 0) {
        return rows[0];
      }

      // Generate new secure random token
      const token = generateSecureToken();
      const id = `link_${bNum}_${Date.now()}`;
      await mysqlPool.query(
        `INSERT INTO upload_links (id, batch_number, token, is_active, upload_link_sent, created_at)
         VALUES (?, ?, ?, 1, 0, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE token = VALUES(token), is_active = 1`,
        [id, bNum, token]
      );
      return {
        id,
        batch_number: bNum,
        token,
        is_active: 1,
        upload_link_sent: 0,
        upload_link_sent_at: null,
        created_at: now.toISOString()
      };
    } catch (err) {
      console.error('[MySQL UploadLink Error]:', err.message);
    }
  }

  // Local storage synchronization fallback
  const localDb = getLocalDatabase();
  if (localDb) {
    if (!localDb.upload_links) localDb.upload_links = [];
    let link = localDb.upload_links.find(l => Number(l.batch_number) === Number(bNum) && l.is_active !== 0);
    if (!link) {
      const token = generateSecureToken();
      link = {
        id: `link_${bNum}_${Date.now()}`,
        batch_number: bNum,
        token,
        is_active: 1,
        upload_link_sent: 0,
        upload_link_sent_at: null,
        created_at: now.toISOString()
      };
      localDb.upload_links.push(link);
      saveLocalDatabase(localDb);
    }
    return link;
  }

  return {
    id: `link_${bNum}_${Date.now()}`,
    batch_number: bNum,
    token: generateSecureToken(),
    is_active: 1,
    upload_link_sent: 0,
    upload_link_sent_at: null,
    created_at: now.toISOString()
  };
}

/**
 * Validate and find upload link by token
 */
export async function getUploadLinkByToken(token) {
  if (!token) return null;

  if (isMySQLConnected()) {
    try {
      const [rows] = await mysqlPool.query(
        'SELECT * FROM upload_links WHERE token = ? AND is_active = 1 LIMIT 1',
        [token]
      );
      if (rows && rows.length > 0) {
        return rows[0];
      }
    } catch (err) {
      console.error('[MySQL getUploadLinkByToken Error]:', err.message);
    }
  }

  // Local fallback
  const localDb = getLocalDatabase();
  if (localDb && localDb.upload_links) {
    const found = localDb.upload_links.find(l => l.token === token && l.is_active !== 0);
    if (found) return found;
  }

  return null;
}

/**
 * Mark upload link as sent via email
 */
export async function setUploadLinkSent(batchNumber) {
  const bNum = parseInt(batchNumber, 10);
  const now = new Date();

  if (isMySQLConnected()) {
    try {
      await mysqlPool.query(
        'UPDATE upload_links SET upload_link_sent = 1, upload_link_sent_at = CURRENT_TIMESTAMP WHERE batch_number = ?',
        [bNum]
      );
    } catch (err) {
      console.error('[MySQL setUploadLinkSent Error]:', err.message);
    }
  }

  const localDb = getLocalDatabase();
  if (localDb && localDb.upload_links) {
    const link = localDb.upload_links.find(l => Number(l.batch_number) === Number(bNum));
    if (link) {
      link.upload_link_sent = 1;
      link.upload_link_sent_at = now.toISOString();
      saveLocalDatabase(localDb);
    }
  }

  return true;
}

/**
 * Get all upload links mapped by batch_number
 */
export async function getAllUploadLinks() {
  const linkMap = new Map();

  if (isMySQLConnected()) {
    try {
      const [rows] = await mysqlPool.query('SELECT * FROM upload_links WHERE is_active = 1');
      if (Array.isArray(rows)) {
        rows.forEach(r => linkMap.set(Number(r.batch_number), r));
      }
    } catch (err) {
      console.error('[MySQL getAllUploadLinks Error]:', err.message);
    }
  }

  const localDb = getLocalDatabase();
  if (localDb && localDb.upload_links) {
    localDb.upload_links.forEach(l => {
      const bNum = Number(l.batch_number);
      if (!linkMap.has(bNum)) {
        linkMap.set(bNum, l);
      }
    });
  }

  return linkMap;
}

/**
 * Completely wipe all stored files, BLOB data, and upload tokens
 */
export async function clearAllFilesAndStorage() {
  let mysqlCleared = false;
  if (isMySQLConnected()) {
    try {
      await mysqlPool.query('DELETE FROM files');
      await mysqlPool.query('DELETE FROM upload_links');
      mysqlCleared = true;
      console.log('[MySQL BLOB Storage] Cleared all file records, BLOB payloads, and upload links.');
    } catch (err) {
      console.error('[MySQL Clear Error]:', err.message);
    }
  }

  const localDb = getLocalDatabase();
  if (localDb) {
    localDb.files = [];
    localDb.upload_links = [];
    localDb.fileUploads = [];
    saveLocalDatabase(localDb);
  }

  return { success: true, mysqlCleared };
}

export default {
  initializeMySQLPool,
  isMySQLConnected,
  saveFileToStorage,
  getFileFromStorage,
  getAllFilesMetadata,
  setFileVerified,
  setNotificationSent,
  getOrCreateUploadLink,
  getUploadLinkByToken,
  setUploadLinkSent,
  getAllUploadLinks,
  generateSecureToken,
  clearAllFilesAndStorage
};
