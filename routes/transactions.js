const Express = require("express");
const Routes = Express.Router();

// Controllers
const Transactions = require("../controllers/transactions");

// Middlewares
const {
    CheckAuthorization,
    VerifyAuthorization,
    RequireAdmin,
} = require("../middlewares/authorization");

const authed = [CheckAuthorization, VerifyAuthorization];
const adminOnly = [...authed, RequireAdmin];

// Payment gateway callbacks (no auth: called by Midtrans)
Routes.get("/:id/accept", Transactions.TransactionApprove);
Routes.post("/notification", Transactions.MidtransNotification);

// Admin
Routes.get("/admin/summary", adminOnly, Transactions.GetAdminSummary);
Routes.get("/admin", adminOnly, Transactions.GetAdmin);
Routes.get("/admin/:id", adminOnly, Transactions.GetDetailByIDAdmin);
Routes.delete("/:id", adminOnly, Transactions.Delete);

// User
Routes.get("/", authed, Transactions.Get);
Routes.get("/:id", authed, Transactions.GetDetailByID);
Routes.post("/:id", authed, Transactions.Create);
Routes.put("/:id", authed, Transactions.Update);
Routes.post("/:id/cancel", authed, Transactions.Cancel);

module.exports = Routes;
