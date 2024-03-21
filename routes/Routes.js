import express from "express";
import auth from "../controller/auth.js";
import { verifyRequest } from "../middleware/middleware.js";
const Router = express.Router();

Router.post("/login", auth.login, verifyRequest);
Router.post("/register", auth.register, verifyRequest);
Router.get("/verify", auth.verifyAndSendMail, verifyRequest);
Router.get("/logout", auth.logout, verifyRequest);
Router.get("/pw-reset-mail", auth.resetPasswordMail);
Router.post("/reset-password", auth.resetPasswordFromCode);


export default Router;
