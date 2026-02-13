const Express = require("express");
const Routes = Express.Router();

// Controllers
const ComingSoon = require("../controllers/coming-soon");

// Routes
Routes.post("/", ComingSoon.Create);
Routes.put("/:id", ComingSoon.Update);
Routes.delete("/:id", ComingSoon.Delete);
Routes.get("/", ComingSoon.Get);
Routes.get("/:id", ComingSoon.GetDetailByID);

module.exports = Routes;
