const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,

    // Render's managed PostgreSQL requires SSL.
    // Local Postgres typically doesn't support/need it,
    // so this is only enabled in production.
    ssl: isProduction
        ? { rejectUnauthorized: false }
        : false
});

module.exports = pool;