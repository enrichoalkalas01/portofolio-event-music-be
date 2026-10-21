const Express = require("express");
const Routes = Express.Router();

// Controllers
const Users = require("../controllers/users");
const Saved = require("../controllers/saved");

// Middlewares
const {
    CheckAuthorization,
    VerifyAuthorization,
    RequireAdmin,
} = require("../middlewares/authorization");

const authed = [CheckAuthorization, VerifyAuthorization];
const adminOnly = [...authed, RequireAdmin];

// User Profile (authenticated)
Routes.get("/profile", authed, Users.GetProfile);
Routes.put("/profile", authed, Users.UpdateProfile);
Routes.put("/change-password", authed, Users.ChangePassword);

// Saved Events (authenticated)
Routes.get("/saved-events", authed, Saved.GetSavedEvents);
Routes.delete("/saved-events/:id", authed, Saved.RemoveSavedEvent);

// Admin
Routes.get("/", adminOnly, Users.Get);
Routes.get("/:id", adminOnly, Users.GetDetailByID);
Routes.put("/:id", adminOnly, Users.UpdateByAdmin);
Routes.delete("/:id", adminOnly, Users.Delete);

module.exports = Routes;
