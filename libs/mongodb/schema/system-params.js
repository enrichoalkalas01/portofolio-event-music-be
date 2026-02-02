// SystemParams.js
const mongoose = require("mongoose");

const SystemParamsSchema = new mongoose.Schema(
    {
        paramsLabel: {
            type: String,
            required: false,
        },
        paramsValue: {
            type: String,
            required: true,
        },
        paramsType: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SystemParamsType",
            required: true,
        },
        paramsDescription: {
            type: String,
            required: false,
        },
        others: {
            type: Object,
            required: false,
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model("SystemParams", SystemParamsSchema);