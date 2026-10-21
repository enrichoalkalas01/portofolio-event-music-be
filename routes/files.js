const Express = require("express");
const Routes = Express.Router();

// Controllers
const { FilesUpload, FilesDelete } = require("../controllers/files");

// Middlewares
const {
    CheckAuthorization,
    VerifyAuthorization,
    RequireAdmin,
} = require("../middlewares/authorization");
const Multer = require("../libs/multer/multer2");

const adminOnly = [CheckAuthorization, VerifyAuthorization, RequireAdmin];

Routes.post("/uploads", adminOnly, [Multer.upload.any()], FilesUpload);
Routes.delete("/uploads", adminOnly, FilesDelete);

module.exports = Routes;
