const Express = require("express");
const Routes = Express.Router();

// External Routes
const SystemParamsTypeRoutes = require("./system-params-type");
const SystemParamsRoutes = require("./system-params");
const AuthenticationRoutes = require("./authentication");
const EventsRoutes = require("./events");
const ComingSoonRoutes = require("./coming-soon");
const TransactionsRoutes = require("./transactions");
const UsersRoutes = require("./users");
const FilesRoutes = require("./files");
const ImagesRoutes = require("./images");

// External Routes Usage
Routes.use("/authentication", AuthenticationRoutes);
Routes.use("/system-params-type", SystemParamsTypeRoutes);
Routes.use("/system-params", SystemParamsRoutes);
Routes.use("/events", EventsRoutes);
Routes.use("/coming-soon", ComingSoonRoutes);
Routes.use("/users", UsersRoutes);
Routes.use("/transactions", TransactionsRoutes);
Routes.use("/files", FilesRoutes);
Routes.use("/images", ImagesRoutes);

module.exports = Routes;
