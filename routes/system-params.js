const Express = require("express");
const Routes = Express.Router();

// Controllers
const SystemParams = require("../controllers/system-params");

// Middlewares
const {
    CheckAuthorization,
    VerifyAuthorization,
    RequireAdmin,
} = require("../middlewares/authorization");

const adminOnly = [CheckAuthorization, VerifyAuthorization, RequireAdmin];

// Routes
Routes.post("/", adminOnly, SystemParams.Create);
Routes.put("/:id", adminOnly, SystemParams.Update);
Routes.delete("/:id", adminOnly, SystemParams.Delete);
Routes.get("/", SystemParams.Get);
Routes.get("/:id", SystemParams.GetDetailByID);
Routes.get("/type/:type_id", SystemParams.GetDetailByType);

module.exports = Routes;
