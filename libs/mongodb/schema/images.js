const Mongoose = require("mongoose");

var Schema = new Mongoose.Schema(
    {
        name: {
            type: String,
        },
        size: {
            type: Number,
        },
        etag: {
            type: String,
        },
        path: {
            type: String,
        },
        contentType: {
            type: String,
        },
        metadata: {
            type: Mongoose.Schema.Types.Mixed,
            default: {},
        },
        others: {
            type: Mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
        strict: false,
        versionKey: false,
    }
);

const Images = Mongoose.model("Images", Schema);

module.exports = Images;
