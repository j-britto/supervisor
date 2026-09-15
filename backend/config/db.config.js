import { env } from './env.config.js';

export const oracleConfig = {
  user: env.ORACLE_USER,
  password: env.ORACLE_PASSWORD,
  connectString: env.ORACLE_CONNECT_STRING,
  poolMin: env.ORACLE_POOL_MIN,
  poolMax: env.ORACLE_POOL_MAX,
  poolIncrement: env.ORACLE_POOL_INCREMENT,
  poolTimeout: env.ORACLE_TIMEOUT,
  enableStatistics: true
};

export default {
  oracle: oracleConfig
};
