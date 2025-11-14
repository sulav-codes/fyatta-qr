//dbconfig.js
const dbConfig = {
  host: process.env.HOST,
  user: process.env.USERNAME2,
  password: process.env.PASSWORD,
  port: process.env.DB_PORT,
  database: process.env.DATABASE,
  dialect: "mysql",
};

module.exports = dbConfig;
