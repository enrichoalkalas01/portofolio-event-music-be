const Express = require("express");
const Routes = Express.Router();

// Controllers
const Users = require("../controllers/users");

// Routes
Routes.post("/", Users.Create);
Routes.put("/:id", Users.Update);
Routes.delete("/:id", Users.Delete);
Routes.get("/", Users.Get);
Routes.get("/:id", Users.GetDetailByID);

module.exports = Routes;
