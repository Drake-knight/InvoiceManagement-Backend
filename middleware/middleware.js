import jwt from "jsonwebtoken";

// INVOICE_AUTH_TOKEN is the name of the cookie that will be sent to the client
const INVOICE_AUTH_TOKEN = process.env.INVOICE_AUTH_TOKEN;

// Check if the request has a cookie with the INVOICE_AUTH_TOKEN and veriify it.
export const verifyRequest = (req, res, next) => {
    try {
        const payload = jwt.verify(
            req.cookies[INVOICE_AUTH_TOKEN],
            process.env.SECRET
        );
        res.locals = payload;
        return next();
    } catch (error) {
        console.error(error);
        return res.status(400).send("Unauthorized Request");
    }
};

