import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import pool from "../config/config.js";
import { sendMail } from "../utils/email.js";

dotenv.config();

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const INVOICE_SECRET = process.env.INVOICE_SECRET;
const EMAIL_SECRET = process.env.EMAIL_SECRET;
const INVOICE_AUTH_TOKEN = process.env.INVOICE_AUTH_TOKEN;
const INVOICE_USER = process.env.INVOICE_USER;

//setting cookies in user's PC locally.
const setCookies = (res, data) => {
    const token = jwt.sign(data, INVOICE_SECRET);  ///, { expiresIn: '1h' }

    // Secure the cookie (check if it was set with the domain mentioned and not locally)
    // const opts = IS_PRODUCTION
    //     ? {
    //         domain: ""
    //     }
    //     : {};

    res.cookie(INVOICE_AUTH_TOKEN, token, {
        secure: IS_PRODUCTION,
        httpOnly: true,
        // ...opts
    });

    res.cookie(INVOICE_USER, JSON.stringify(data), {
        secure: IS_PRODUCTION,
        // ...opts
    });
};


//Verification route

const verifyAndSendMail = async (req, res) => {
    const email = req.query.email.toLowerCase();
    try {
        pool.query('SELECT * FROM new_table WHERE email = ?', [email], async (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "An error occurred" });
            }

            if (results.length !== 0) {
                return res.status(400).json({
                    message: `The email, ${email} is already associated with another account.`
                });
            }

            const encryptedEmail = crypto
                .createHmac("sha1", EMAIL_SECRET)
                .update(email)
                .digest("hex")
                .substring(0, 6);

            try {
                await sendMail(email, "email-verification", {
                    verificationCode: encryptedEmail
                });
            } catch (error) {
                return res
                    .status(500)
                    .json({ message: "Mail couldn't be sent. Please try again." });
            }

            return res.json({ message: "Verification Email sent" });
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "An error occurred" });
    }
};

// Register Route
const register = async (req, res) => {
    try {
        const { verificationCode } = req.body;

        const encryptedEmail = crypto
            .createHmac("sha1", EMAIL_SECRET)
            .update(req.body.email)
            .digest("hex")
            .substring(0, 6);

        const isVerified = crypto.timingSafeEqual(
            Buffer.from(encryptedEmail),
            Buffer.from(verificationCode)
        );

        if (!isVerified) {
            const verificationError = new Error("Wrong verification code");
            verificationError.code = 400;
            throw verificationError;
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const email = req.body.email.toLowerCase();
        const name = req.body.name;

        console.log(email, name, hashedPassword);

        const data = await pool.execute(
            'INSERT INTO new_table (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );
        setCookies(res, {
            name,
            email,
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

        const data = await pool.execute('SELECT * FROM new_table WHERE email = ?', [email]);
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
            name: user.name,
            email: user.email,
        });

        res.json({ name: user.name });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// Reset Password Mail Route
const resetPasswordMail = async (req, res) => {
    try {
        const email = req.query.email;
        const data = await pool.execute(
            'SELECT * FROM new_table WHERE email = ?',
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

        res.json({ message: "E-Mail sent." });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message });
    }
};


const resetPasswordFromCode = async (req, res) => {
    const { email, resetCode, newPassword } = req.body;

    try {
        const data = await pool.execute(
            'SELECT * FROM new_table WHERE email = ?',
            [email]
        );
        const [rows, fields] = data || [];

        if (rows.length === 0) {
            return res.status(400).json({ message: "No account was found with the E-Mail." });
        }
        console.log(rows[0])
        const user = rows[0];

        const codeFromUser = crypto.createHash("md5").update(user.password).digest("hex").substring(0, 6);
        const resetCodeCorrect = codeFromUser === resetCode;
        if (resetCodeCorrect) {
            const newHashedPassword = await bcrypt.hash(newPassword, 10);

            await pool.execute(
                'UPDATE new_table SET password = ? WHERE email = ?',
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
        const opts = IS_PRODUCTION
            ? {
                domain: "runverve.onrender.com"
            }
            : {};

        // Clear all the Cookies that was set
        res.clearCookie(INVOICE_AUTH_TOKEN, {
            secure: IS_PRODUCTION,
            httpOnly: true,
            // ...opts
        });

        res.clearCookie(INVOICE_USER, {
            secure: IS_PRODUCTION,
            // ...opts
        });
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
    verifyAndSendMail,
    register,
    login,
    resetPasswordMail,
    resetPasswordFromCode,
    logout,
};