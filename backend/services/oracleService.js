import { executeSQL, getOracleStatus, initializeOraclePool } from '../config/oracle.js';
import { getLocalDatabase } from '../helpers/dbHelper.js';

export async function testOracleConnection() {
  const status = getOracleStatus();
  if (!status.connected) {
    // Attempt connection
    await initializeOraclePool();
  }

  const updatedStatus = getOracleStatus();
  if (updatedStatus.connected) {
    const testQuery = await executeSQL('SELECT SYSDATE, USER FROM DUAL');
    return {
      connected: true,
      serverTime: testQuery.data?.[0]?.SYSDATE,
      currentUser: testQuery.data?.[0]?.USER,
      connectString: updatedStatus.connectString,
      pool: updatedStatus.poolSize
    };
  }

  return {
    connected: false,
    message: updatedStatus.error || 'Oracle Database is not reachable. Local JSON persistence active.',
    connectString: updatedStatus.connectString
  };
}

export async function getDatabaseMetrics() {
  const status = getOracleStatus();
  const localDb = getLocalDatabase() || {};

  return {
    engine: status.connected ? 'Oracle Database (SQL)' : 'Local JSON Store (Oracle Standby)',
    oracleStatus: status,
    tables: {
      students: localDb.students ? localDb.students.length : 0,
      projects: localDb.projects ? localDb.projects.length : 0,
      mentors: localDb.mentors ? localDb.mentors.length : 0,
      reviews: localDb.reviews ? localDb.reviews.length : 0,
      notifications: localDb.notifications ? localDb.notifications.length : 0
    },
    timestamp: new Date().toISOString()
  };
}

export default {
  testOracleConnection,
  getDatabaseMetrics
};
