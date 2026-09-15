import oracledb from 'oracledb';
import { oracleConfig } from './db.config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable oracledb auto-commit and format output as objects
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

let pool = null;
let isOracleConnected = false;
let lastConnectionError = null;

/**
 * Initialize Oracle Connection Pool using thin mode (no Instant Client needed)
 */
export async function initializeOraclePool() {
  if (!oracleConfig.password) {
    console.log('[Oracle SQL] Notice: ORACLE_PASSWORD is not set. Oracle pool in standby mode with local fallback.');
    isOracleConnected = false;
    lastConnectionError = 'ORACLE_PASSWORD not provided in environment';
    return null;
  }

  try {
    console.log(`[Oracle SQL] Connecting to Oracle Database at ${oracleConfig.connectString} as ${oracleConfig.user}...`);
    pool = await oracledb.createPool({
      user: oracleConfig.user,
      password: oracleConfig.password,
      connectString: oracleConfig.connectString,
      poolMin: oracleConfig.poolMin,
      poolMax: oracleConfig.poolMax,
      poolIncrement: oracleConfig.poolIncrement,
      poolTimeout: oracleConfig.poolTimeout
    });

    isOracleConnected = true;
    lastConnectionError = null;
    console.log('[Oracle SQL] ✅ Oracle Database connection pool initialized successfully.');
    
    // Auto-create core schema tables if they do not exist
    await initializeOracleSchema();
    return pool;
  } catch (err) {
    isOracleConnected = false;
    lastConnectionError = err.message;
    console.warn(`[Oracle SQL] ⚠️ Could not connect to Oracle Database: ${err.message}`);
    console.warn('[Oracle SQL] Switching to local persistent storage adapter for seamless operations.');
    return null;
  }
}

/**
 * Execute an Oracle SQL query safely with connection acquisition and release
 */
export async function executeSQL(sql, binds = {}, options = {}) {
  if (!pool || !isOracleConnected) {
    return {
      success: false,
      isFallback: true,
      error: lastConnectionError || 'Oracle Database connection is not available'
    };
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: true,
      ...options
    });
    return {
      success: true,
      data: result.rows || [],
      rowsAffected: result.rowsAffected || 0,
      metaData: result.metaData
    };
  } catch (err) {
    console.error(`[Oracle SQL Error] Query failed: ${sql}`, err.message);
    return {
      success: false,
      error: err.message
    };
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error('[Oracle SQL] Error closing connection:', closeErr);
      }
    }
  }
}

/**
 * Initialize Oracle DDL tables
 */
async function initializeOracleSchema() {
  const tableDefinitions = [
    `CREATE TABLE PSMS_USERS (
      ID VARCHAR2(50) PRIMARY KEY,
      USERNAME VARCHAR2(100) NOT NULL UNIQUE,
      EMAIL VARCHAR2(150) NOT NULL,
      PHONE VARCHAR2(20),
      PASSWORD VARCHAR2(255) NOT NULL,
      USER_ID VARCHAR2(50),
      PROFILE_IMAGE VARCHAR2(500),
      CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE PSMS_STUDENTS (
      ID VARCHAR2(50) PRIMARY KEY,
      NAME VARCHAR2(150) NOT NULL,
      ROLL_NUMBER VARCHAR2(50) NOT NULL UNIQUE,
      REGISTER_NUMBER NUMBER NOT NULL UNIQUE,
      PHONE VARCHAR2(20),
      CLASS VARCHAR2(10),
      YEAR VARCHAR2(10),
      DEPARTMENT VARCHAR2(50),
      EMAIL VARCHAR2(150),
      MENTOR_ROLL_NUMBER VARCHAR2(50),
      BATCH_NUMBER NUMBER DEFAULT 35,
      TEAM_NUMBER NUMBER DEFAULT 1,
      CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE PSMS_PROJECTS (
      ID VARCHAR2(50) PRIMARY KEY,
      PROJECT_TITLE VARCHAR2(255) NOT NULL,
      DESCRIPTION VARCHAR2(1000),
      OBJECTIVE VARCHAR2(1000),
      TECH_STACK VARCHAR2(255),
      BATCH_NUMBER NUMBER NOT NULL,
      MENTOR_ROLL_NUMBER VARCHAR2(50),
      STUDENT1_REGISTER_NUMBER NUMBER,
      STUDENT2_REGISTER_NUMBER NUMBER,
      PROJECT_STATUS VARCHAR2(50) DEFAULT 'In Progress',
      PUBLICATION_STATUS VARCHAR2(50) DEFAULT 'Submitted',
      CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE PSMS_REVIEWS (
      ID VARCHAR2(50) PRIMARY KEY,
      REVIEW_NUMBER NUMBER NOT NULL,
      BATCH_NUMBER NUMBER NOT NULL,
      STUDENT_REGISTER_NUMBER NUMBER NOT NULL,
      PROJECT_TITLE VARCHAR2(255),
      PROJECT_STATUS VARCHAR2(50),
      REVIEW_STATUS VARCHAR2(50) DEFAULT 'Not Completed',
      MARK NUMBER DEFAULT 0,
      MAX_MARK NUMBER DEFAULT 10,
      COMPLETED NUMBER(1) DEFAULT 0,
      REVIEW_DATE VARCHAR2(30),
      COMMENTS VARCHAR2(1000),
      CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE PSMS_QUEUE_TASKS (
      ID VARCHAR2(50) PRIMARY KEY,
      TASK_TYPE VARCHAR2(50) NOT NULL,
      PAYLOAD CLOB NOT NULL,
      STATUS VARCHAR2(30) DEFAULT 'PENDING',
      ATTEMPTS NUMBER DEFAULT 0,
      MAX_ATTEMPTS NUMBER DEFAULT 3,
      ERROR_MESSAGE VARCHAR2(1000),
      CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PROCESSED_AT TIMESTAMP
    )`
  ];

  for (const ddl of tableDefinitions) {
    try {
      await executeSQL(ddl);
    } catch (e) {
      // Table already exists or ORA-00955, safe to ignore
    }
  }
}

/**
 * Get Oracle Connection Status
 */
export function getOracleStatus() {
  return {
    connected: isOracleConnected,
    connectString: oracleConfig.connectString,
    user: oracleConfig.user,
    error: lastConnectionError,
    poolSize: pool ? { min: oracleConfig.poolMin, max: oracleConfig.poolMax } : null
  };
}

/**
 * Close Oracle Connection Pool
 */
export async function closeOraclePool() {
  if (pool) {
    try {
      await pool.close(10);
      console.log('[Oracle SQL] Connection pool closed.');
    } catch (err) {
      console.error('[Oracle SQL] Error closing pool:', err);
    }
  }
}

export default {
  initializeOraclePool,
  executeSQL,
  getOracleStatus,
  closeOraclePool
};
