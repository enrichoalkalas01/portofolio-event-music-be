const Express = require("express");
const Routes = Express.Router();

// Libs
const Minio = require("../libs/minio/index");

// Controllers
const { FilesUpload, FilesDelete } = require("../controllers/files");

const Multer = require("../libs/multer/multer2");

Routes.post("/uploads", [Multer.upload.any()], FilesUpload);
Routes.delete("/uploads", FilesDelete);

module.exports = Routes;
