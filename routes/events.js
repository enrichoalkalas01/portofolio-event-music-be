const Express = require("express");
const Routes = Express.Router();

// Controllers
const Events = require("../controllers/events");

// Middlewares
const {
    CheckAuthorization,
    VerifyAuthorization,
} = require("../middlewares/authorization")

// Routes
Routes.post("/", [CheckAuthorization, VerifyAuthorization], Events.Create);
Routes.put("/:id", [CheckAuthorization, VerifyAuthorization], Events.Update);
Routes.delete("/:id", [CheckAuthorization, VerifyAuthorization], Events.Delete);
Routes.get("/", Events.Get);
Routes.get("/:id", Events.GetDetailByID);

module.exports = Routes;