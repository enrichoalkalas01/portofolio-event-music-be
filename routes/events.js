const Express = require("express");
const Routes = Express.Router();

// Controllers
const Events = require("../controllers/events");

// Middlewares
const {
    CheckAuthorization,
    VerifyAuthorization,
    OptionalAuthorization,
    RequireAdmin,
} = require("../middlewares/authorization");

const adminOnly = [CheckAuthorization, VerifyAuthorization, RequireAdmin];

// Routes
Routes.post("/", adminOnly, Events.Create);
Routes.put("/:id", adminOnly, Events.Update);
Routes.delete("/:id", adminOnly, Events.Delete);

// Public (admins with a token also see DRAFT / non-active events)
Routes.get("/", OptionalAuthorization, Events.Get);
Routes.get("/coming-soon", OptionalAuthorization, Events.GetListlByComingSoon);
Routes.get("/categories", Events.GetCategories);
Routes.get("/:id", OptionalAuthorization, Events.GetDetailByID);

module.exports = Routes;
