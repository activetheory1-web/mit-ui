import sql from 'mssql';
import { DefaultAzureCredential } from '@azure/identity';

const sqlConfig: sql.config = {
  database: process.env.FABRIC_DATABASE,
  server: process.env.FABRIC_SQL_SERVER || '',
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: true, // Required for Azure/Fabric
    trustServerCertificate: false, // Fabric requires valid certs
  },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export const getFabricConnection = async (): Promise<sql.ConnectionPool> => {
  if (!poolPromise) {
    if (!process.env.FABRIC_SQL_SERVER) {
      console.warn('Missing FABRIC_SQL_SERVER environment variable. Fabric SQL queries will fail.');
    }

    try {
      // Get access token using Azure Service Principal
      const credential = new DefaultAzureCredential();
      const token = await credential.getToken('https://database.windows.net/.default');

      // Add access token to config
      const configWithToken: sql.config = {
        ...sqlConfig,
        authentication: {
          type: 'azure-active-directory-access-token',
          options: {
            token: token.token
          }
        },
      };

      poolPromise = new sql.ConnectionPool(configWithToken).connect().catch(err => {
        console.error('Fabric SQL Connection Failed:', err);
        poolPromise = null;
        throw err;
      });
    } catch (error) {
      console.error('Failed to get Azure access token:', error);
      throw new Error('Failed to authenticate with Azure Service Principal');
    }
  }
  return poolPromise;
};
