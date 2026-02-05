const Moment = require("moment");

const { ResponseHandlerSuccess } = require("../middlewares/response-handler");

const UsersModel = require("../libs/mongodb/schema/users");

const Create = async (req, res, next) => {
    const { paramsLabel, paramsValue } = req.body;
    try {
        let DataPassing = {
            paramsLabel: paramsLabel,
            paramsValue: paramsValue,
        };

        await UsersModel.create(DataPassing);

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
    const { paramsLabel, paramsValue } = req.body;
    try {
        let DataPassing = {
            paramsLabel: paramsLabel,
            paramsValue: paramsValue,
        };

        await UsersModel.updateOne({ _id: id }, { $set: DataPassing });

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
        await UsersModel.deleteOne({ _id: id });

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
            UsersModel.find(queryData),
            UsersModel.countDocuments(queryData),
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
        const getData = await UsersModel.findOne({ _id: id });

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
