const mongoose = require("mongoose");

const SystemParamsTypeSchema = new mongoose.Schema(
    {
        paramsLabel: {
            type: String,
            required: true,
        },
        paramsValue: {
            type: String,
            required: true,
            unique: true,
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

module.exports = mongoose.model("SystemParamsType", SystemParamsTypeSchema);
