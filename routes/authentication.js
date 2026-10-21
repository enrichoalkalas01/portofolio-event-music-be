const Express = require("express");
const Routes = Express.Router();

// Controllers
const Authentication = require("../controllers/authentication");

// Middlewares
const {
    CheckAuthorization,
    VerifyAuthorization,
} = require("../middlewares/authorization");

// Routes
Routes.post("/login", Authentication.Login);
Routes.post("/register", Authentication.Register);
Routes.post("/refresh-token", Authentication.RefreshToken);
Routes.get("/me", [CheckAuthorization, VerifyAuthorization], Authentication.Me);

module.exports = Routes;
