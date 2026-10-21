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
        if (String(id) === String(req.user.id)) {
            throw { status: 400, message: "You cannot delete your own account." };
        }
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
        const Authorization = req.user;

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
        const Authorization = req.user;

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


const Bcrypt = require("bcrypt");

// PUT /users/change-password { currentPassword, newPassword }
const ChangePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body || {};
        if (!currentPassword || !newPassword) {
            throw { status: 400, message: "currentPassword and newPassword are required." };
        }
        if (String(newPassword).length < 8) {
            throw { status: 400, message: "New password must be at least 8 characters." };
        }

        const user = await UsersModel.findOne({ _id: new ObjectId(req.user.id) });
        if (!user) throw { status: 404, message: "User not found" };

        const matching = await Bcrypt.compare(currentPassword, user.password);
        if (!matching) throw { status: 400, message: "Current password is incorrect." };

        user.password = await Bcrypt.hash(newPassword, 12);
        await user.save();

        ResponseHandlerSuccess({ req, res, message: "Password changed successfully" });
    } catch (error) {
        next(error);
    }
};

// PUT /users/:id (admin) { role, isActive, fullname, phonenumber }
const UpdateByAdmin = async (req, res, next) => {
    const { id } = req.params;
    try {
        const { role, isActive, fullname, phonenumber } = req.body || {};
        const set = {};
        if (role !== undefined) {
            if (!["guest", "user", "admin", "super_admin", "member"].includes(role)) {
                throw { status: 400, message: "Invalid role." };
            }
            set.role = role;
        }
        if (isActive !== undefined) set.isActive = !!isActive;
        if (fullname !== undefined) set.fullname = fullname;
        if (phonenumber !== undefined) set.phonenumber = phonenumber;

        if (String(id) === String(req.user.id) && set.role && !["admin", "super_admin"].includes(set.role)) {
            throw { status: 400, message: "You cannot remove your own admin role." };
        }

        const updated = await UsersModel.findOneAndUpdate({ _id: id }, { $set: set }, { new: true }).select(
            "-password -activationToken -activationExpires",
        );
        if (!updated) throw { status: 404, message: "User not found" };

        ResponseHandlerSuccess({ req, res, data: updated, message: "Update Success" });
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
    ChangePassword,
    UpdateByAdmin,
};
