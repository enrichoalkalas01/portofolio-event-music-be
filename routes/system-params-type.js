const Express = require("express");
const Routes = Express.Router();

// Controllers
const SystemParamsType = require("../controllers/system-params-type");

// Routes
Routes.post("/", SystemParamsType.Create);
Routes.put("/:id", SystemParamsType.Update);
Routes.delete("/:id", SystemParamsType.Delete);
Routes.get("/", SystemParamsType.Get);
Routes.get("/:id", SystemParamsType.GetDetailByID);

module.exports = Routes;