const Express = require("express");
const Routes = Express.Router();

const ImagesController = require("../controllers/images");

// Middlewares
const {
    CheckAuthorization,
    VerifyAuthorization,
    RequireAdmin,
} = require("../middlewares/authorization");

const adminOnly = [CheckAuthorization, VerifyAuthorization, RequireAdmin];

Routes.get("/", adminOnly, ImagesController.GetImagesList);
Routes.get("/:id", adminOnly, ImagesController.GetImagesDetail);
Routes.delete("/:id", adminOnly, ImagesController.DeleteImagesByID);

module.exports = Routes;
