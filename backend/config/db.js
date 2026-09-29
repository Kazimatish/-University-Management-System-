   require('dotenv').config();
   // SSL is only turned on when DB_SSL=true (needed for online databases, not for XAMPP)
   const ssl = process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined;
   module.exports = require('mysql2/promise').createPool({
     host: process.env.DB_HOST,
     port: process.env.DB_PORT || 3306,
     user: process.env.DB_USER,
     password: process.env.DB_PASSWORD,
     database: process.env.DB_NAME,
     dateStrings: true,
     ssl
   });