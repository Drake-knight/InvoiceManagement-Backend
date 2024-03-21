import { connectToMySQL } from "./config/config.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import apiRouter from "./routes/Routes.js";
import dotenv from 'dotenv';
dotenv.config();


const app = express();

const PORT = process.env.PORT || 5100;

const main = async () => {
    await connectToMySQL();

    app.use(
        cors({
            credentials: true,
            origin: [
                /https?:\/\/localhost:\d{4}/,
            ]
        })
    );

    app.use(cookieParser());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use("/", apiRouter);

    app.listen(PORT, () => {
        console.info(`Express HTTP server running at ${PORT}`);
    });
};

main();
