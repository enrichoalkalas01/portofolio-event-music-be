const Express = require("express");
const Routes = Express.Router();

// Controllers
const ComingSoon = require("../controllers/coming-soon");

// Middlewares
const {
    CheckAuthorization,
    VerifyAuthorization,
    RequireAdmin,
} = require("../middlewares/authorization");

const adminOnly = [CheckAuthorization, VerifyAuthorization, RequireAdmin];

// Routes
Routes.post("/", adminOnly, ComingSoon.Create);
Routes.put("/:id", adminOnly, ComingSoon.Update);
Routes.delete("/:id", adminOnly, ComingSoon.Delete);
Routes.get("/", ComingSoon.Get);
Routes.get("/:id", ComingSoon.GetDetailByID);

module.exports = Routes;
