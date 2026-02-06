const mongoose = require("mongoose");

const TransactionsSchema = new mongoose.Schema(
    {
        event_id: {
            type: String,
            required: true,
        },
        status_transaction: {
            type: String,
            required: false,
            default: "no_transaction",
            enum: [
                "no_transaction",
                "checkout",
                "cancelled",
                "failed",
                "pending",
                "success",
            ],
        },
        request: {
            type: Object,
            required: false,
        },
        payment: {
            type: Object,
            required: false,
        },
        settlement: {
            type: Object,
            required: false,
        },
        user: {
            type: Object,
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

module.exports = mongoose.model("Transactions", TransactionsSchema);
