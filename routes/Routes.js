import express from "express";
import auth from "../controller/auth.js";
import invoice from "../controller/invoice.js";
import { verifyRequest } from "../middleware/middleware.js";
const Router = express.Router();

Router.post("/login", auth.login);
Router.post("/register", auth.register);
Router.get("/logout", verifyRequest, auth.logout);
Router.post("/pw-reset-mail", auth.resetPasswordMail);
Router.post("/reset-password", auth.resetPasswordFromCode);

Router.get("/invoices/:user_id", verifyRequest, invoice.getAllInvoices);
Router.post("/invoices", verifyRequest, invoice.addInvoice);
Router.delete("/invoices/:invoice_id", verifyRequest, invoice.deleteInvoice);
Router.put("/invoices/:invoice_id", verifyRequest, invoice.editInvoice);


export default Router;
