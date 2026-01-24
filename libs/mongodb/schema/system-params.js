const mongoose = require("mongoose");

const SystemParamsSchema = new mongoose.Schema(
    {
        paramsLabel: {
            type: String,
            required: true,
        },
        paramsValue: {
            type: String,
            required: true,
            // unique: true,
        },
        paramsType: {
            type: String,
            required: true,
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
