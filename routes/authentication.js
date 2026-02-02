const Express = require("express");
const Routes = Express.Router();

// Controllers
const Authentication = require("../controllers/authentication");

// Routes
Routes.post("/login", Authentication.Login);
Routes.post("/register", Authentication.Register);

module.exports = Routes;