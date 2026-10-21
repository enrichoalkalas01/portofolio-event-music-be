const Express = require("express");
const Routes = Express.Router();

// Controllers
const SystemParamsType = require("../controllers/system-params-type");

// Middlewares
const {
    CheckAuthorization,
    VerifyAuthorization,
    RequireAdmin,
} = require("../middlewares/authorization");

const adminOnly = [CheckAuthorization, VerifyAuthorization, RequireAdmin];

// Routes
Routes.post("/", adminOnly, SystemParamsType.Create);
Routes.put("/:id", adminOnly, SystemParamsType.Update);
Routes.delete("/:id", adminOnly, SystemParamsType.Delete);
Routes.get("/", SystemParamsType.Get);
Routes.get("/:id", SystemParamsType.GetDetailByID);

module.exports = Routes;
