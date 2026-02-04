const Moment = require("moment");
const { ObjectId } = require("mongodb");

const { ResponseHandlerSuccess } = require("../middlewares/response-handler");

const SystemParamsModel = require("../libs/mongodb/schema/system-params");

const Create = async (req, res, next) => {
    const { paramsLabel, paramsValue, paramsType, paramsDescription } =
        req.body;
    try {
        let DataPassing = {
            paramsLabel: paramsLabel,
            paramsValue: paramsValue?.toUpperCase(),
            paramsType: paramsType,
            paramsDescription: paramsDescription,
        };

        await SystemParamsModel.create(DataPassing);

        ResponseHandlerSuccess({
            req,
            res,
            message: "Create  Success",
        });
    } catch (error) {
        next(error);
    }
};

const Update = async (req, res, next) => {
    const { id } = req.params;
    const { paramsLabel, paramsValue, paramsType, paramsDescription } =
        req.body;
    try {
        let DataPassing = {
            paramsLabel: paramsLabel,
            paramsValue: paramsValue?.toUpperCase(),
            paramsType: paramsType,
            paramsDescription: paramsDescription,
        };

        await SystemParamsModel.updateOne({ _id: id }, { $set: DataPassing });

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
        await SystemParamsModel.deleteOne({ _id: id });

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
    const { paramsType } = req.query;
    try {
        let queryData = {};
        if (paramsType) {
            queryData.paramsType = paramsType;
        }

        const [getData, total] = await Promise.all([
            SystemParamsModel.find(queryData),
            SystemParamsModel.countDocuments(queryData),
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
        const getData = await SystemParamsModel.findOne({ _id: id });

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

const GetDetailByType = async (req, res, next) => {
    const { type_id } = req.params;
    try {
        if (!type_id) {
            throw {
                status: 400,
                message: "type_id must be filled.",
            };
        }

        console.log("Type ID : ", type_id);
        const getData = await SystemParamsModel.find({
            paramsType: new ObjectId(type_id),
        });

        ResponseHandlerSuccess({
            req,
            res,
            data: getData,
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
    GetDetailByType,
};
