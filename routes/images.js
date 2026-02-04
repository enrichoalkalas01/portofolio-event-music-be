const Express = require("express");
const Routes = Express.Router();

const ImagesController = require("../controllers/images");

Routes.get("/", ImagesController.GetImagesList);
Routes.get("/:id", ImagesController.GetImagesDetail);
Routes.delete("/:id", ImagesController.DeleteImagesByID);

module.exports = Routes;
