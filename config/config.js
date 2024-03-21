import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const MYSQL_HOST = process.env.MYSQL_HOST;
const MYSQL_USER = process.env.MYSQL_USER;
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD;
const MYSQL_DATABASE = process.env.MYSQL_DATABASE;

const pool = mysql.createPool({
    host: MYSQL_HOST,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export const connectToMySQL = async () => {
    try {
        pool.getConnection((err, connection) => {
            if (err) {
                console.error("Error connecting to MySQL:", err);
                process.exit(-1);
            } else {
                console.log("MySQL is connected successfully");
                connection.release();
            }
        });
    } catch (error) {
        console.error("Unexpected error:", error);
        process.exit(-1);
    }
};

export default pool;
