const Express = require("express");
const Routes = Express.Router();

// Controllers
const Transactions = require("../controllers/transactions");

// Middlewares
const {
    CheckAuthorization,
    VerifyAuthorization,
} = require("../middlewares/authorization");

// Routes
Routes.post("/", Transactions.Create);

Routes.post(
    "/:id",
    [CheckAuthorization, VerifyAuthorization],
    Transactions.Create,
);
Routes.put(
    "/:id",
    [CheckAuthorization, VerifyAuthorization],
    Transactions.Update,
);

Routes.delete("/:id", Transactions.Delete);

Routes.get("/admin", Transactions.GetAdmin);
Routes.get("/admin/:id", Transactions.GetDetailByIDAdmin);

Routes.get("/", [CheckAuthorization, VerifyAuthorization], Transactions.Get);
Routes.get(
    "/:id",
    [CheckAuthorization, VerifyAuthorization],
    Transactions.GetDetailByID,
);

Routes.get("/:id/accept", Transactions.TransactionApprove);

module.exports = Routes;
