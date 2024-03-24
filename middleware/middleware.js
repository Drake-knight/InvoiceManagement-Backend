import jwt from "jsonwebtoken";

export const verifyRequest = (req, res, next) => {
    try {
        const payload = jwt.verify(
            req.cookies["INVOICE_AUTH_TOKEN"],
            process.env.INVOICE_SECRET
        );
        res.locals = payload;
        return next();
    } catch (error) {
        console.error(error);
        return res.status(400).send("Unauthorized Request");
    }
};

