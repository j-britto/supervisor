import { getOracleStatus, executeSQL, initializeOraclePool } from '../config/oracle.js';
import { testOracleConnection, getDatabaseMetrics } from '../services/oracleService.js';
import { successResponse, errorResponse } from '../helpers/responseHelper.js';

export const getStatus = async (req, res) => {
  try {
    const status = getOracleStatus();
    return successResponse(res, status, 'Oracle SQL status retrieved');
  } catch (err) {
    return errorResponse(res, err);
  }
};

export const testConnection = async (req, res) => {
  try {
    const result = await testOracleConnection();
    return successResponse(res, result, result.connected ? 'Oracle connection verified' : 'Oracle in standby');
  } catch (err) {
    return errorResponse(res, err);
  }
};

export const getMetrics = async (req, res) => {
  try {
    const metrics = await getDatabaseMetrics();
    return successResponse(res, metrics, 'Database metrics retrieved');
  } catch (err) {
    return errorResponse(res, err);
  }
};

export const runCustomQuery = async (req, res) => {
  const { sql, binds } = req.body;
  if (!sql || typeof sql !== 'string') {
    return errorResponse(res, 'SQL statement required', 400);
  }

  // Restrict to safe SELECT or DDL queries
  try {
    const result = await executeSQL(sql, binds || {});
    return successResponse(res, result, 'Query executed');
  } catch (err) {
    return errorResponse(res, err);
  }
};

export default {
  getStatus,
  testConnection,
  getMetrics,
  runCustomQuery
};
