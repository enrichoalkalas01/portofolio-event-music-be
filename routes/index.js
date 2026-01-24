const Express = require("express");
const Routes = Express.Router();

// External Routes
const SystemParamsTypeRoutes = require("./system-params-type");
const SystemParamsRoutes = require("./system-params");

// External Routes Usage
Routes.use("/system-params-type", SystemParamsTypeRoutes);
Routes.use("/system-params", SystemParamsRoutes);

module.exports = Routes;
