import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import pool from "../config/config.js";
import { sendMail } from "../utils/email.js";

dotenv.config();

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const INVOICE_SECRET = process.env.INVOICE_SECRET;

const setCookies = (res, data) => {
    const token = jwt.sign(data, INVOICE_SECRET);

    res.cookie("INVOICE_AUTH_TOKEN", token, {
        sameSite: "none",
        secure: true,
    });

    res.cookie("INVOICE_USER", JSON.stringify(data), {
        sameSite: "none",
        secure: true,
    });
};



// Register Route
const register = async (req, res) => {
    try {

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const email = req.body.email.toLowerCase();
        const name = req.body.Name;

        const data = await pool.execute(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );
        setCookies(res, {
            name,
            email,
            userId: data[0].insertId,
        });

        res.json({ name });
    } catch (error) {
        console.log(error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                message: `The email or userID is already associated with another registered account. Please use another email.`
            });
        }
        if (error.code === 400) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: error.message });
    }
};


// Login Route
const login = async (req, res) => {
    try {
        const email = req.body.email.toLowerCase();
        const password = req.body.password;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        const data = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        const [rows, fields] = data || [];

        if (rows.length === 0) {
            return res.status(400).json({ message: `The email you've entered doesn't match any account. Sign up for an account.` });
        }

        const user = rows[0];

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: `Wrong password. Try again or click Forgot password to reset it.` });
        }
        setCookies(res, {
            name: user.username,
            email: user.email,
            userId: user.user_id,
        });

        res.json({ name: user.username });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// Reset Password Mail Route
const resetPasswordMail = async (req, res) => {
    try {
        const email = req.body.email;
        const data = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        const [rows, fields] = data || [];

        if (rows.length === 0) {
            return res.status(400).json({ message: "No account was found with the E-Mail." });
        }

        const user = rows[0];
        const pw = user.password;
        const resetCode = crypto.createHash("md5").update(pw).digest("hex").substring(0, 6);

        try {
            await sendMail(email, "password-reset", {
                name: user.name,
                code: resetCode,
            });
        } catch (error) {
            return res.status(500).json({ message: "An error occurred" });
        }

        res.json({ message: "E-Mail sent.", email: email });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message });
    }
};


const resetPasswordFromCode = async (req, res) => {
    const { email, resetCode, newPassword } = req.body;

    try {
        const data = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        const [rows, fields] = data || [];

        if (rows.length === 0) {
            return res.status(400).json({ message: "No account was found with the E-Mail." });
        }
        const user = rows[0];

        const codeFromUser = crypto.createHash("md5").update(user.password).digest("hex").substring(0, 6);
        const resetCodeCorrect = codeFromUser === resetCode;
        if (resetCodeCorrect) {
            const newHashedPassword = await bcrypt.hash(newPassword, 10);

            await pool.execute(
                'UPDATE users SET password = ? WHERE email = ?',
                [newHashedPassword, email]
            );

            res.json({ message: "Password updated successfully!" });
        } else {
            res.status(400).json({ message: "Reset code is incorrect or expired" });
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "An error occurred" });
    }
};

//Logout
const logout = async (req, res) => {
    try {
        res.clearCookie("INVOICE_AUTH_TOKEN");
        res.clearCookie("INVOICE_USER");
        res.json({ message: "Logged Out" });
    } catch (error) {
        if (error.code === 9090) {
            res.status(400).json({ message: "Unauthorized Request" });
        } else {
            res.status(500).json({ message: "An error occured." });
        }
    }
};
export default {
    register,
    login,
    resetPasswordMail,
    resetPasswordFromCode,
    logout,
};