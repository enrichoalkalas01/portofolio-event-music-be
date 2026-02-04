// Library
const Validator = require("fastest-validator");
const Moment = require("moment");
const { Types } = require("mongoose");

// Utils
const v = new Validator();
const { ResponseHandlerSuccess } = require("../middlewares/response-handler");
const {
    BuildQueryOptions2,
    BuildQueryOptions3,
} = require("../libs/mongodb/functions/filters");
const { UploadFromLocalFileHandler } = require("../libs/minio/handler");
const ImagesModel = require("../libs/mongodb/schema/images");

const FilesUpload = async (req, res, next) => {
    try {
        const files = req.files;
        for (let i in files) {
            let fileProcessThumbnail = await UploadFromLocalFileHandler({
                file: files[i],
                folder: "all",
                customFileName: files[i]?.finename || files[i]?.originalname,
            });

            // console.log(files[i]);
            console.log(fileProcessThumbnail);

            let metadata = {
                name: fileProcessThumbnail.object_name,
                size: fileProcessThumbnail.size,
                etag: fileProcessThumbnail.etag,
                path: fileProcessThumbnail?.path || "",
                contentType: fileProcessThumbnail.contentType,
                metadata: {
                    ...fileProcessThumbnail,
                    object_name: fileProcessThumbnail.object_name,
                    url_proxy: `/api/v1/files/view/${fileProcessThumbnail.object_name}`,
                    url_image: fileProcessThumbnail.object_name,
                },
                others: { fulldata: fileProcessThumbnail },
                updatedAt: new Date(), // Tambahkan timestamp
            };

            let create = await ImagesModel.create(metadata);
        }
        ResponseHandlerSuccess({
            req,
            res,
            message: "Successfull to upload files",
        });
    } catch (error) {
        next(error);
    }
};

const FilesDelete = async (req, res, next) => {
    const { object_name } = req.body;

    try {
        console.log(object_name);
        ResponseHandlerSuccess({
            req,
            res,
            message: "Successfull to delete file",
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    FilesUpload,
    FilesDelete,
};
