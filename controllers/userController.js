const { User } = require('../models')
const bcrypt = require("bcrypt");



exports.updateUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { userName, email, phone } = req.body;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const updatedFields = { id: user.id };


        if (email && email !== user.email) {
            const emailExists = await User.findOne({ where: { email } });
            if (emailExists) {
                return res.status(400).json({ message: "Email already in use" });
            }
        }

        if (userName && userName !== user.userName) {
            user.userName = userName;
            updatedFields.userName = userName;
        }

        if (email && email !== user.email) {
            user.email = email;
            updatedFields.email = email;
        }

        if (phone && phone !== user.phone) {
            user.phone = phone;
            updatedFields.phone = phone;
        }

        await user.save();

        return res.status(200).json({
            message: "Profile updated successfully",
            updated: updatedFields
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error updating profile" });
    }
}


exports.softDeleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        const { password } = req.body;

        if (!password)
            return res.status(400).json({ message: "Password is required" });

        const user = await User.findByPk(userId);

        if (!user)
            return res.status(404).json({ message: "User not found" });

        const match = await bcrypt.compare(password, user.password);
        if (!match)
            return res.status(401).json({ message: "Incorrect password" });

        await user.destroy();

        return res.status(200).json({
            message: "Account has been deleted",
            deletedUserId: userId
        });

    } catch (error) {
        console.error("Soft Delete Error:", error);
        res.status(500).json({ message: "Could not delete account" });
    }
}


exports.restoreDeletedAccount = async (req, res) => {
    try {
        const userId = req.user.id;

        await User.restore({ where: { id: userId } });

        return res.status(200).json({ message: "Account restored" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Could not restore account" });
    }
};


