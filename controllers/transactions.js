const midtransClient = require("midtrans-client");
const { ObjectId } = require("mongodb");

const { ResponseHandlerSuccess } = require("../middlewares/response-handler");

const TransactionModel = require("../libs/mongodb/schema/transactions");
const EventsModel = require("../libs/mongodb/schema/events");
const { attachTicketStats, OCCUPYING_STATUSES } = require("./events");

const MidtransClientKey = process.env.MIDTRANS_CLIENT_KEY;
const MidtransServerKey = process.env.MIDTRANS_SERVER_KEY;
const BaseUrl =
    process.env.MIDTRANS_CALLBACK_URL || `http://localhost:5800/api/v1`;
const FrontendUrl = (process.env.MIDTRANS_CALLBACK_URL_DONE || "http://localhost:6500").replace(/\/+$/, "");

const TAX_PERCENT = 11;
const MAX_QTY_PER_ORDER = 4;

const isValidId = (id) => ObjectId.isValid(id) && String(new ObjectId(id)) === String(id);

const eventLookupStages = [
    {
        $addFields: {
            event_id_object: {
                $convert: { input: "$event_id", to: "objectId", onError: null, onNull: null },
            },
        },
    },
    { $lookup: { from: "events", localField: "event_id_object", foreignField: "_id", as: "event" } },
    { $unwind: { path: "$event", preserveNullAndEmptyArrays: true } },
    { $project: { event_id_object: 0 } },
];

const computeAmounts = (price, qty) => {
    const subtotal = Number(price) * qty;
    const tax_total = Math.round((subtotal * TAX_PERCENT) / 100);
    return { subtotal, tax_total, total_payment: subtotal + tax_total };
};

// POST /transactions/:id  -> start a checkout for an event
const Create = async (req, res, next) => {
    const { id } = req.params;
    try {
        const Authorization = req.user;
        if (!isValidId(id)) throw { status: 404, message: "Event not found." };

        const eventDoc = await EventsModel.findOne({ _id: id }).lean();
        if (!eventDoc) throw { status: 404, message: "Event not found." };

        const event = await attachTicketStats(eventDoc);
        if (event.status !== "ACTIVE") {
            throw { status: 400, message: "Event is not open for ticket sales." };
        }
        if (event.is_past) {
            throw { status: 400, message: "Event has already ended." };
        }
        if (event.is_sold_out) {
            throw { status: 400, message: "Tickets for this event are sold out." };
        }

        // Reuse an open checkout so the user does not pile up duplicate drafts.
        const existing = await TransactionModel.findOne({
            event_id: id,
            "user.id": Authorization.id,
            status_transaction: "checkout",
        }).sort({ createdAt: -1 });

        if (existing) {
            return ResponseHandlerSuccess({
                req,
                res,
                data: existing,
                message: "Resumed existing checkout",
            });
        }

        const response = await TransactionModel.create({
            event_id: id,
            status_transaction: "checkout",
            request: null,
            payment: null,
            settlement: null,
            user: {
                id: Authorization.id,
                username: Authorization.username,
                email: Authorization.email,
                type: Authorization.role,
            },
        });

        ResponseHandlerSuccess({ req, res, status: 201, data: response, message: "Create Success" });
    } catch (error) {
        next(error);
    }
};

// PUT /transactions/:id -> submit buyer details and create the Midtrans Snap transaction
const Update = async (req, res, next) => {
    const { id } = req.params;
    try {
        const Authorization = req.user;
        if (!isValidId(id)) throw { status: 404, message: "Transaction not found." };

        const existing = await TransactionModel.findOne({
            _id: new ObjectId(id),
            "user.id": Authorization.id,
        });
        if (!existing) throw { status: 404, message: "Transaction not found." };
        if (existing.status_transaction !== "checkout") {
            throw { status: 400, message: `Transaction is already ${existing.status_transaction}.` };
        }

        const eventDoc = await EventsModel.findOne({ _id: existing.event_id }).lean();
        if (!eventDoc) throw { status: 404, message: "Event not found." };
        const event = await attachTicketStats(eventDoc);
        if (event.status !== "ACTIVE" || event.is_past) {
            throw { status: 400, message: "Event is no longer open for ticket sales." };
        }

        const qty = Math.min(Math.max(parseInt(req.body?.qty, 10) || 1, 1), MAX_QTY_PER_ORDER);
        if (qty > event.tickets_remaining) {
            throw { status: 400, message: `Only ${event.tickets_remaining} ticket(s) left.` };
        }

        // Amounts are always derived from the event price, never trusted from the client.
        const amounts = computeAmounts(event.price, qty);

        const customer = {
            first_name: req.body?.firstname,
            last_name: req.body?.lastname,
            email: req.body?.email,
            phone: req.body?.phonenumber,
        };
        const address = {
            ...customer,
            address: req.body?.address,
            city: req.body?.city,
            postal_code: req.body?.zip_code || req.body?.postal_code,
            country_code: "IDN",
        };

        const parameter = {
            transaction_details: {
                order_id: `INV-${id}-${Date.now()}`,
                gross_amount: amounts.total_payment,
            },
            item_details: [
                {
                    id: `TICKET-${event._id}`,
                    price: Number(event.price),
                    quantity: qty,
                    name: String(event.title).slice(0, 50),
                    category: "Ticket",
                },
                {
                    id: `TAX-${id}`,
                    price: amounts.tax_total,
                    quantity: 1,
                    name: `PPN ${TAX_PERCENT}%`,
                    category: "Tax",
                },
            ],
            customer_details: {
                ...customer,
                billing_address: address,
                shipping_address: address,
            },
            enabled_payments: ["gopay", "shopeepay", "bca_va", "bni_va", "qris"],
            callbacks: { finish: `${BaseUrl}/transactions/${id}/accept` },
            expiry: { unit: "hours", duration: 1 },
            custom_field1: `User ${Authorization.username}`,
            custom_field2: `User ID : ${Authorization.id}`,
        };

        if (!MidtransServerKey) {
            throw { status: 503, message: "Payment gateway is not configured (MIDTRANS_SERVER_KEY)." };
        }

        const snap = new midtransClient.Snap({
            isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
            serverKey: MidtransServerKey,
            clientKey: MidtransClientKey,
        });
        const createTransaction = await snap.createTransaction(parameter);

        await TransactionModel.findOneAndUpdate(
            { _id: new ObjectId(id) },
            {
                $set: {
                    status_transaction: "pending",
                    request: { ...req.body, qty, ...amounts },
                    payment: { ...parameter, snap: createTransaction },
                    settlement: null,
                },
            },
        );

        ResponseHandlerSuccess({ req, res, data: createTransaction, message: "Create Success" });
    } catch (error) {
        next(error);
    }
};

// POST /transactions/:id/cancel -> user cancels an open checkout / pending payment
const Cancel = async (req, res, next) => {
    const { id } = req.params;
    try {
        if (!isValidId(id)) throw { status: 404, message: "Transaction not found." };

        const updated = await TransactionModel.findOneAndUpdate(
            {
                _id: new ObjectId(id),
                "user.id": req.user.id,
                status_transaction: { $in: ["checkout", "pending"] },
            },
            { $set: { status_transaction: "cancelled" } },
            { new: true },
        );
        if (!updated) throw { status: 404, message: "Open transaction not found." };

        ResponseHandlerSuccess({ req, res, data: updated, message: "Transaction cancelled" });
    } catch (error) {
        next(error);
    }
};

const Delete = async (req, res, next) => {
    const { id } = req.params;
    try {
        if (!isValidId(id)) throw { status: 404, message: "Transaction not found." };
        const deleted = await TransactionModel.deleteOne({ _id: id });
        if (!deleted.deletedCount) throw { status: 404, message: "Transaction not found." };
        ResponseHandlerSuccess({ req, res, message: "Delete Success" });
    } catch (error) {
        next(error);
    }
};

const paginate = (req) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const size = Math.min(Math.max(parseInt(req.query.size, 10) || 10, 1), 200);
    return { page, size, skip: (page - 1) * size };
};

const listTransactions = async (req, matchStage) => {
    const { status, search } = req.query;
    const { page, size, skip } = paginate(req);

    const match = { ...matchStage };
    if (status && status !== "all") match.status_transaction = status;

    const pipeline = [
        { $match: match },
        { $sort: { createdAt: -1 } },
        ...eventLookupStages,
    ];
    if (search) {
        pipeline.push({
            $match: {
                $or: [
                    { "event.title": { $regex: search, $options: "i" } },
                    { "user.username": { $regex: search, $options: "i" } },
                    { "user.email": { $regex: search, $options: "i" } },
                ],
            },
        });
    }

    const [result] = await TransactionModel.aggregate([
        ...pipeline,
        {
            $facet: {
                data: [{ $skip: skip }, { $limit: size }],
                total: [{ $count: "count" }],
            },
        },
    ]);

    return { data: result?.data || [], total: result?.total?.[0]?.count || 0, page, size };
};

const Get = async (req, res, next) => {
    try {
        const { data, total } = await listTransactions(req, { "user.id": req.user.id });
        ResponseHandlerSuccess({ req, res, data, total, message: "Get list data Success" });
    } catch (error) {
        next(error);
    }
};

const GetDetailByID = async (req, res, next) => {
    const { id } = req.params;
    try {
        if (!isValidId(id)) throw { status: 404, message: "Transaction not found." };

        const [result] = await TransactionModel.aggregate([
            { $match: { _id: new ObjectId(id), "user.id": req.user.id } },
            ...eventLookupStages,
        ]);
        if (!result) throw { status: 404, message: "Transaction not found." };

        ResponseHandlerSuccess({ req, res, data: result, message: "Get By ID Success" });
    } catch (error) {
        next(error);
    }
};

// GET /transactions/:id/accept -> Midtrans "finish" redirect
const TransactionApprove = async (req, res, next) => {
    const { id } = req.params;
    const { order_id } = req.query;

    try {
        if (!isValidId(id) || !order_id) {
            return res.redirect(`${FrontendUrl}/dashboard/transactions`);
        }

        const existing = await TransactionModel.findOne({ _id: new ObjectId(id) });
        if (!existing) {
            return res.redirect(`${FrontendUrl}/dashboard/transactions`);
        }

        const coreApi = new midtransClient.CoreApi({
            isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
            serverKey: MidtransServerKey,
            clientKey: MidtransClientKey,
        });
        const status = await coreApi.transaction.status(order_id);

        const settled =
            ["settlement", "capture"].includes(status?.transaction_status) &&
            String(status?.status_code) === "200";
        const failed = ["cancel", "deny", "expire", "failure"].includes(status?.transaction_status);

        if (settled || failed) {
            await TransactionModel.findOneAndUpdate(
                { _id: new ObjectId(id) },
                {
                    $set: {
                        settlement: status,
                        status_transaction: settled ? "success" : "failed",
                    },
                },
            );
        }

        return res.redirect(`${FrontendUrl}/dashboard/transactions/${id}`);
    } catch (error) {
        next(error);
    }
};

// POST /transactions/notification -> Midtrans HTTP notification webhook
const MidtransNotification = async (req, res, next) => {
    try {
        const coreApi = new midtransClient.CoreApi({
            isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
            serverKey: MidtransServerKey,
            clientKey: MidtransClientKey,
        });
        // Verifies the signature against Midtrans before trusting the payload.
        const status = await coreApi.transaction.notification(req.body);

        const txId = String(status.order_id || "").split("-")[1];
        if (!isValidId(txId)) return res.status(200).json({ status: "ignored" });

        const settled =
            ["settlement", "capture"].includes(status.transaction_status) &&
            status.fraud_status !== "challenge";
        const failed = ["cancel", "deny", "expire", "failure"].includes(status.transaction_status);

        if (settled || failed) {
            await TransactionModel.findOneAndUpdate(
                { _id: new ObjectId(txId), status_transaction: { $ne: "success" } },
                {
                    $set: {
                        settlement: status,
                        status_transaction: settled ? "success" : "failed",
                    },
                },
            );
        }

        res.status(200).json({ status: "ok" });
    } catch (error) {
        next(error);
    }
};

const GetAdmin = async (req, res, next) => {
    try {
        const { data, total } = await listTransactions(req, {});
        ResponseHandlerSuccess({ req, res, data, total, message: "Get list data Success" });
    } catch (error) {
        next(error);
    }
};

const GetDetailByIDAdmin = async (req, res, next) => {
    const { id } = req.params;
    try {
        if (!isValidId(id)) throw { status: 404, message: "Transaction not found." };

        const [result] = await TransactionModel.aggregate([
            { $match: { _id: new ObjectId(id) } },
            ...eventLookupStages,
        ]);
        if (!result) throw { status: 404, message: "Transaction not found." };

        ResponseHandlerSuccess({ req, res, data: result, message: "Get By ID Success" });
    } catch (error) {
        next(error);
    }
};

// GET /transactions/admin/summary -> dashboard figures
const GetAdminSummary = async (req, res, next) => {
    try {
        const [byStatus, revenue, events, users] = await Promise.all([
            TransactionModel.aggregate([
                { $group: { _id: "$status_transaction", count: { $sum: 1 } } },
            ]),
            TransactionModel.aggregate([
                { $match: { status_transaction: "success" } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $ifNull: ["$request.total_payment", 0] } },
                        tickets: { $sum: { $ifNull: ["$request.qty", 1] } },
                    },
                },
            ]),
            EventsModel.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
            require("../libs/mongodb/schema/users").countDocuments({}),
        ]);

        ResponseHandlerSuccess({
            req,
            res,
            data: {
                transactions: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
                revenue: revenue[0]?.total || 0,
                tickets_sold: revenue[0]?.tickets || 0,
                events: Object.fromEntries(events.map((s) => [s._id, s.count])),
                users,
            },
            message: "Get summary Success",
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    Create,
    Update,
    Cancel,
    Delete,
    Get,
    GetDetailByID,
    TransactionApprove,
    MidtransNotification,

    GetAdmin,
    GetDetailByIDAdmin,
    GetAdminSummary,
};
