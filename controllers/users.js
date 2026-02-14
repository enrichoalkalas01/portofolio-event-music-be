const { ObjectId } = require("mongodb");

const { ResponseHandlerSuccess } = require("../middlewares/response-handler");

const UsersModel = require("../libs/mongodb/schema/users");

// ========== ADMIN ==========

const Get = async (req, res, next) => {
    try {
        const [getData, total] = await Promise.all([
            UsersModel.find({})
                .select("-password -activationToken -activationExpires")
                .sort({ createdAt: -1 }),
            UsersModel.countDocuments({}),
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
        const getData = await UsersModel.findOne({ _id: id }).select(
            "-password -activationToken -activationExpires",
        );

        if (!getData) {
            throw { status: 404, message: "User not found" };
        }

        ResponseHandlerSuccess({
            req,
            res,
            data: getData,
            message: "Get By ID Success",
        });
    } catch (error) {
        next(error);
    }
};

const Delete = async (req, res, next) => {
    const { id } = req.params;
    try {
        const user = await UsersModel.findOne({ _id: id });
        if (!user) {
            throw { status: 404, message: "User not found" };
        }

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

// ========== USER PROFILE ==========

const GetProfile = async (req, res, next) => {
    try {
        const Authorization = process.env.authorization
            ? JSON.parse(process.env.authorization)
            : null;

        if (!Authorization) {
            throw { status: 401, message: "Unauthorized!" };
        }

        const user = await UsersModel.findOne({
            _id: new ObjectId(Authorization.id),
        }).select("-password -activationToken -activationExpires");

        if (!user) {
            throw { status: 404, message: "User not found" };
        }

        ResponseHandlerSuccess({
            req,
            res,
            data: user,
            message: "Get Profile Success",
        });
    } catch (error) {
        next(error);
    }
};

const UpdateProfile = async (req, res, next) => {
    try {
        const Authorization = process.env.authorization
            ? JSON.parse(process.env.authorization)
            : null;

        if (!Authorization) {
            throw { status: 401, message: "Unauthorized!" };
        }

        const {
            fullname,
            phonenumber,
            avatar,
            address,
        } = req.body;

        const updateData = {};
        if (fullname !== undefined) updateData.fullname = fullname;
        if (phonenumber !== undefined) updateData.phonenumber = phonenumber;
        if (avatar !== undefined) updateData.avatar = avatar;
        if (address) {
            if (address.street !== undefined)
                updateData["address.street"] = address.street;
            if (address.city !== undefined)
                updateData["address.city"] = address.city;
            if (address.province !== undefined)
                updateData["address.province"] = address.province;
            if (address.postalCode !== undefined)
                updateData["address.postalCode"] = address.postalCode;
            if (address.country !== undefined)
                updateData["address.country"] = address.country;
        }

        await UsersModel.findOneAndUpdate(
            { _id: new ObjectId(Authorization.id) },
            { $set: updateData },
        );

        const updatedUser = await UsersModel.findOne({
            _id: new ObjectId(Authorization.id),
        }).select("-password -activationToken -activationExpires");

        ResponseHandlerSuccess({
            req,
            res,
            data: updatedUser,
            message: "Update Profile Success",
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    Get,
    GetDetailByID,
    Delete,
    GetProfile,
    UpdateProfile,
};
