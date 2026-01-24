const Express = require("express");
const Routes = Express.Router();

// Controllers
const SystemParams = require("../controllers/system-params");

// Routes
Routes.post("/", SystemParams.Create);
Routes.put("/:id", SystemParams.Update);
Routes.delete("/:id", SystemParams.Delete);
Routes.get("/", SystemParams.Get);
Routes.get("/:id", SystemParams.GetDetailByID);

module.exports = Routes;