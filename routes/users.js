const Express = require("express");
const Routes = Express.Router();

// Controllers
const Users = require("../controllers/users");
const Saved = require("../controllers/saved");

// Middlewares
const {
    CheckAuthorization,
    VerifyAuthorization,
} = require("../middlewares/authorization");

// User Profile (authenticated)
Routes.get(
    "/profile",
    [CheckAuthorization, VerifyAuthorization],
    Users.GetProfile,
);
Routes.put(
    "/profile",
    [CheckAuthorization, VerifyAuthorization],
    Users.UpdateProfile,
);

// Saved Events (authenticated)
Routes.get(
    "/saved-events",
    [CheckAuthorization, VerifyAuthorization],
    Saved.GetSavedEvents,
);
Routes.delete(
    "/saved-events/:id",
    [CheckAuthorization, VerifyAuthorization],
    Saved.RemoveSavedEvent,
);

// Admin
Routes.get("/", Users.Get);
Routes.get("/:id", Users.GetDetailByID);
Routes.delete("/:id", Users.Delete);

module.exports = Routes;
