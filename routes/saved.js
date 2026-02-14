const Express = require("express");
const Routes = Express.Router();

// Controllers
const Saved = require("../controllers/saved");

// Middlewares
const {
    CheckAuthorization,
    VerifyAuthorization,
} = require("../middlewares/authorization");

// Check if event is saved
Routes.get(
    "/check/:id",
    [CheckAuthorization, VerifyAuthorization],
    Saved.CheckSaved,
);

// Save/Unsave event (toggle)
Routes.post(
    "/:id",
    [CheckAuthorization, VerifyAuthorization],
    Saved.SaveEvent,
);

module.exports = Routes;
