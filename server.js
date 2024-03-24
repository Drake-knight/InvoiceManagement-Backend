import { connectToMySQL } from "./config/config.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import apiRouter from "./routes/Routes.js";
import dotenv from 'dotenv';
import { Customer, Invoice, LineItem, User } from "./model/invoice.js";
dotenv.config();


const app = express();

const PORT = process.env.PORT || 5100;

const main = async () => {
    await connectToMySQL();
    app.use(
        cors({
            credentials: true,
            origin: function (origin, callback) {
                if (/^http:\/\/localhost(:\d+)?$/.test(origin) || origin === 'https://invoice-management-frontend-nine.vercel.app') {
                    callback(null, true)
                } else {
                    callback(new Error('Not allowed by CORS'))
                }
            }
        })
    );

    app.use(cookieParser());
    await Customer.createTable();
    await Invoice.createTable();
    await LineItem.createTable();
    await User.createTable();


    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use("/", apiRouter);

    app.listen(PORT, () => {
        console.info(`Express HTTP server running at ${PORT}`);
    });
};

main();
