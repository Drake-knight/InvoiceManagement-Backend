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

        jwt.verify(token, process.env.INVOICE_SECRET, (err, decoded) => {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    return res.status(401).send("Token expired");
                }
                return res.status(401).send("Invalid token");
            }
            res.locals.user = decoded;
            next();
        });
    } catch (error) {
        console.error(error);
        return res.status(401).send("Unauthorized Request");
    }
};
