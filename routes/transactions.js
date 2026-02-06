const Express = require("express");
const Routes = Express.Router();

// Controllers
const Transactions = require("../controllers/transactions");

// Routes
Routes.post("/", Transactions.Create);
Routes.put("/:id", Transactions.Update);
Routes.delete("/:id", Transactions.Delete);
Routes.get("/", Transactions.Get);
Routes.get("/:id", Transactions.GetDetailByID);

module.exports = Routes;
