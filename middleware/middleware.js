import jwt from "jsonwebtoken";

export const verifyRequest = (req, res, next) => {
    try {
        let token;
        const bearerToken = req.headers.authorization;
        if (bearerToken) {
            token = bearerToken.split(' ')[1];

        }
        if (!token) {
            return res.status(401).send("No token provided");
        }

        const decoded = jwt.verify(token, process.env.INVOICE_SECRET);
        res.locals.user = decoded;
        next();
    } catch (error) {
        console.error(error);
        return res.status(401).send("Unauthorized Request");
    }
};
