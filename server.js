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
    // on local add regex to allow localhost
    app.use(
        cors({
            credentials: true,
            origin: 'https://invoice-management-frontend.vercel.app'
        })
    );
    // app.use(
    //     cors({
    //         credentials: true,
    //         origin: (origin, callback) => {
    //             if (origin === 'https://invoice-management-frontend-nine.vercel.app' || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
    //                 callback(null, true)
    //             } else {
    //                 callback(new Error('Not allowed by CORS'))
    //             }
    //         }
    //     })
    // );

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

export default app;