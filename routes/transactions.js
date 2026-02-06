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
Routes.put("/:id", Transactions.Update);

Routes.delete("/:id", Transactions.Delete);
Routes.get("/", Transactions.Get);
Routes.get("/:id", Transactions.GetDetailByID);

module.exports = Routes;
