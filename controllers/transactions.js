const Moment = require("moment");
const midtransClient = require("midtrans-client");

const { ResponseHandlerSuccess } = require("../middlewares/response-handler");

const TransactionModel = require("../libs/mongodb/schema/transactions");

const MidtransClientKey = process.env.MIDTRANS_CLIENT_KEY;
const MidtransServerKey = process.env.MIDTRANS_SERVER_KEY;

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
                phone: req.body?.phone_number,
                billing_address: {
                    first_name: req.body?.firstname,
                    last_name: req.body?.lastname,
                    phone: req.body?.phone_number,
                    address: req.body?.address,
                    city: req.body?.city,
                    postal_code: req.body?.postal_code,
                    country_code: "IDN",
                },
                shipping_address: {
                    first_name: req.body?.firstname,
                    last_name: req.body?.lastname,
                    phone: req.body?.phone_number,
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
                finish: `http://localhost:5800/api/v1/transactions/${id}/accept`,
            },

            expiry: {
                unit: "hours",
                duration: 1,
            },

            custom_field1: `User ${Authorization?.username}`,
            custom_field2: `User ID : ${Authorization?.id}`,
        };

        console.log(parameter);

        const snap = await new midtransClient.Snap({
            isProduction: false,
            serverKey: MidtransServerKey,
            clientKey: MidtransClientKey,
        });

        const createTransaction = await snap.createTransaction(parameter);
        console.log(createTransaction);

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

const Update = async (req, res, next) => {
    const { id } = req.params;
    const { paramsLabel, paramsValue } = req.body;
    try {
        let DataPassing = {
            paramsLabel: paramsLabel,
            paramsValue: paramsValue,
        };

        await TransactionModel.updateOne({ _id: id }, { $set: DataPassing });

        ResponseHandlerSuccess({
            req,
            res,
            message: "Update Success",
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
        const queryData = {};
        const [getData, total] = await Promise.all([
            TransactionModel.find(queryData),
            TransactionModel.countDocuments(queryData),
        ]);

        ResponseHandlerSuccess({
            req,
            res,
            data: getData,
            total: total,
            message: "Get list data Success",
        });
    } catch (error) {
        next(error);
    }
};

const GetDetailByID = async (req, res, next) => {
    const { id } = req.params;
    try {
        const getData = await TransactionModel.findOne({ _id: id });

        ResponseHandlerSuccess({
            req,
            res,
            data: getData,
            message: "Get By ID  Success",
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
};
