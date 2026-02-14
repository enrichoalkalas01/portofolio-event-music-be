const Moment = require("moment");
const midtransClient = require("midtrans-client");
const { ObjectId } = require("mongodb");

const { ResponseHandlerSuccess } = require("../middlewares/response-handler");

const TransactionModel = require("../libs/mongodb/schema/transactions");

const MidtransClientKey = process.env.MIDTRANS_CLIENT_KEY;
const MidtransServerKey = process.env.MIDTRANS_SERVER_KEY;
const BaseUrl =
    process.env.MIDTRANS_CALLBACK_URL || `http://localhost:5800/api/v1`;

const Create = async (req, res, next) => {
    const { id } = req.params;
    try {
        let Authorization = process.env.authorization
            ? JSON.parse(process.env.authorization)
            : null;

        if (!Authorization) {
            throw {
                status: 401,
                message: "Unauthorized!",
            };
        }

        const tranasactionData = {
            event_id: id,
            status_transaction: "checkout",
            request: null,
            payment: null,
            settlement: null,
            user: Authorization,
        };

        const response = await TransactionModel.create(tranasactionData);

        ResponseHandlerSuccess({
            req,
            res,
            data: response,
            message: "Create  Success",
        });
    } catch (error) {
        next(error);
    }
};

const Update = async (req, res, next) => {
    const { id } = req.params;
    try {
        let Authorization = process.env.authorization
            ? JSON.parse(process.env.authorization)
            : null;

        if (!Authorization) {
            throw {
                status: 401,
                message: "Unauthorized!",
            };
        }

        const getExistTransaction = await TransactionModel.findOne({
            _id: new ObjectId(id),
        });

        if (!getExistTransaction) {
            throw {
                status: 404,
                message: "Transaction not found.",
            };
        }

        const mappedProduct = [
            {
                id: `INV-${id}`,
                price: Number(req.body?.subtotal),
                quantity: req.body?.qty || 1,
                name: "Ticket",
                category: "Products",
            },
            {
                id: `INV-${id}-Addons`,
                price: Number(req.body?.tax_total),
                quantity: 1,
                name: "Tax",
                category: "Additional Products",
            },
        ];

        const parameter = {
            transaction_details: {
                order_id: `INV-${id}-${Date.now()}`,
                gross_amount: req.body?.total_payment,
            },

            item_details: mappedProduct,
            customer_details: {
                first_name: req.body?.firstname,
                last_name: req.body?.lastname,
                email: req.body?.email,
                phone: req.body?.phonenumber,
                billing_address: {
                    first_name: req.body?.firstname,
                    last_name: req.body?.lastname,
                    phone: req.body?.phonenumber,
                    address: req.body?.address,
                    city: req.body?.city,
                    postal_code: req.body?.postal_code,
                    country_code: "IDN",
                },
                shipping_address: {
                    first_name: req.body?.firstname,
                    last_name: req.body?.lastname,
                    phone: req.body?.phonenumber,
                    address: req.body?.address,
                    city: req.body?.city,
                    postal_code: req.body?.postal_code,
                    country_code: "IDN",
                },
            },

            enabled_payments: [
                "gopay",
                "shopeepay",
                "bca_va",
                "bni_va",
                "qris",
            ],

            callbacks: {
                finish: `${BaseUrl}/transactions/${id}/accept`,
            },

            expiry: {
                unit: "hours",
                duration: 1,
            },

            custom_field1: `User ${Authorization?.username}`,
            custom_field2: `User ID : ${Authorization?.id}`,
        };

        const snap = await new midtransClient.Snap({
            isProduction: false,
            serverKey: MidtransServerKey,
            clientKey: MidtransClientKey,
        });

        const createTransaction = await snap.createTransaction(parameter);
        console.log(createTransaction);

        const tranasactionData = {
            status_transaction: "pending",
            request: req.body,
            payment: parameter,
            settlement: null,
            user: Authorization,
        };

        await TransactionModel.findOneAndUpdate(
            {
                _id: new ObjectId(id),
            },
            {
                $set: {
                    ...tranasactionData,
                },
            },
        );

        ResponseHandlerSuccess({
            req,
            res,
            data: createTransaction,
            message: "Create  Success",
        });
    } catch (error) {
        next(error);
    }
};

const Delete = async (req, res, next) => {
    const { id } = req.params;
    try {
        await TransactionModel.deleteOne({ _id: id });

        ResponseHandlerSuccess({
            req,
            res,
            message: "Delete Success",
        });
    } catch (error) {
        next(error);
    }
};

const Get = async (req, res, next) => {
    try {
        const matchStage = {};

        const [getData, countResult] = await Promise.all([
            TransactionModel.aggregate([
                { $match: matchStage },
                { $sort: { createdAt: -1 } },
                {
                    $addFields: {
                        event_id_object: {
                            $convert: {
                                input: "$event_id",
                                to: "objectId",
                                onError: null,
                                onNull: null,
                            },
                        },
                    },
                },
                {
                    $lookup: {
                        from: "events",
                        localField: "event_id_object",
                        foreignField: "_id",
                        as: "event",
                    },
                },
                {
                    $unwind: {
                        path: "$event",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $project: {
                        event_id_object: 0,
                    },
                },
            ]).exec(),
            TransactionModel.countDocuments(matchStage),
        ]);

        ResponseHandlerSuccess({
            req,
            res,
            data: getData,
            total: countResult,
            message: "Get list data Success",
        });
    } catch (error) {
        next(error);
    }
};

const GetDetailByID = async (req, res, next) => {
    const { id } = req.params;
    try {
        const getData = await TransactionModel.aggregate([
            { $match: { _id: new ObjectId(id) } },
            {
                $addFields: {
                    event_id_object: {
                        $convert: {
                            input: "$event_id",
                            to: "objectId",
                            onError: null,
                            onNull: null,
                        },
                    },
                },
            },
            {
                $lookup: {
                    from: "events",
                    localField: "event_id_object",
                    foreignField: "_id",
                    as: "event",
                },
            },
            {
                $unwind: {
                    path: "$event",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    event_id_object: 0,
                },
            },
        ]).exec();

        const result = getData?.[0];
        if (!result) {
            throw { status: 404, message: "transaction is not found" };
        }

        ResponseHandlerSuccess({
            req,
            res,
            data: result,
            message: "Get By ID Success",
        });
    } catch (error) {
        next(error);
    }
};

const TransactionApprove = async (req, res, next) => {
    const { id } = req.params;
    const { order_id, status_code, action, transaction_status } = req.query;

    try {
        if (!id || !order_id) {
            throw {
                status: 400,
                mssage: "Bad request.",
            };
        }

        let getExistTransaction = await TransactionModel.findOne({
            _id: new ObjectId(id),
        });

        if (!getExistTransaction) {
            // throw {
            //     status: 404,
            //     message: "transaction not found.",
            // };

            res.redirect(
                `${process.env.MIDTRANS_CALLBACK_URL_DONE}/transactions/${id}`,
            );
        }

        const coreApi = await new midtransClient.CoreApi({
            isProduction: false,
            serverKey: MidtransServerKey,
            clientKey: MidtransClientKey,
        });

        const statusTransactionMidtrans =
            await coreApi.transaction.status(order_id);

        if (
            !statusTransactionMidtrans?.status_code?.includes("200") &&
            !statusTransactionMidtrans?.transaction_status !== "settlement"
        ) {
            // throw {
            //     status: 401,
            //     message: "transaction is still on progress",
            // };
            res.redirect(
                `${process.env.MIDTRANS_CALLBACK_URL_DONE}/checkout/${id}`,
            );
        }

        await TransactionModel.findOneAndUpdate(
            {
                _id: new ObjectId(id),
            },
            {
                $set: {
                    settlement: statusTransactionMidtrans,
                    status_transaction: "success",
                },
            },
        );

        res.redirect(
            `${process.env.MIDTRANS_CALLBACK_URL_DONE}/checkout/${id}`,
        );

        ResponseHandlerSuccess({
            req,
            res,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    Create,
    Update,
    Delete,
    Get,
    GetDetailByID,
    TransactionApprove,
};
