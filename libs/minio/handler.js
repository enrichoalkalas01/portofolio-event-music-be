const FS = require("fs");

const { UploadFromLocalFile } = require("./index");

const UploadFromLocalFileHandler = async ({ file, folder, customFileName }) => {
    try {
        if (!file) {
            throw {
                message: "no files found.",
            };
        }

        let uploadFile = await UploadFromLocalFile({
            LocalFilePath: file.path,
            Folder: folder ? folder : "",
            ObjectName: customFileName,
        });

        if (uploadFile?.status) {
            FS.unlink(file.path, (err) => {
                if (err) {
                    console.log("Failed to delete file.");
                } else {
                    console.log("Success to delete file.");
                }
            });
        }

        return uploadFile;
    } catch (error) {
        return {
            status: false,
            message: error?.message,
        };
    }
};

const UploadFromBufferFileHandler = async ({ file }) => {
    try {
        if (!file) {
            throw {
                message: "no files found.",
            };
        }
    } catch (error) {
        return {
            status: false,
            message: error?.message,
        };
    }
};

module.exports = {
    UploadFromLocalFileHandler,
    UploadFromBufferFileHandler,
};
