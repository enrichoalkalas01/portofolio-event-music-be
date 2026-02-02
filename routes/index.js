const Express = require("express");
const Routes = Express.Router();

// External Routes
const SystemParamsTypeRoutes = require("./system-params-type");
const SystemParamsRoutes = require("./system-params");
const AuthenticationRoutes = require("./authentication")
const EventsRoutes = require("./events")
const ComingSoonRoutes = require("./coming-soon")
const TransactionsRoutes = require("./transactions")
const UsersRoutes = require("./users")

// External Routes Usage
Routes.use("/authentication", AuthenticationRoutes)
Routes.use("/system-params-type", SystemParamsTypeRoutes);
Routes.use("/system-params", SystemParamsRoutes);
Routes.use("/events", EventsRoutes)
Routes.use("/coming-soon", ComingSoonRoutes)
Routes.use("/users", UsersRoutes)
Routes.use("/transactions", TransactionsRoutes)

module.exports = Routes;
