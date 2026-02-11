const { User } = require('../models')
const bcrypt = require("bcrypt")
const AppError = require('../utils/AppError')
const catchAsync = require('../utils/catchAsync')
const { uploadToCloud, deleteFromCloud }= require('../middleware/cloudinary')



exports.updateUserProfile = async (req, res) => {
    try {
        const userId = req.user.id
        const { userName, email, phone } = req.body

        const user = await User.findByPk(userId)
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        if (!user.verified) {
            return res.status(403).json({
                message: "Please verify your account before updating your profile"
            })
        }

        const updatedFields = { id: user.id }


        if (email && email !== user.email) {
            const emailExists = await User.findOne({ where: { email } })
            if (emailExists) {
                return res.status(400).json({ message: "Email already in use" })
            }
        }

        if (userName && userName !== user.userName) {
            user.userName = userName
            updatedFields.userName = userName
        }

        if (email && email !== user.email) {
            user.email = email
            updatedFields.email = email
        }

        if (phone && phone !== user.phone) {
            user.phone = phone
            updatedFields.phone = phone
        }

        await user.save();

        return res.status(200).json({
            message: "Profile updated successfully",
            updated: updatedFields
        });

    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Server error updating profile" })
    }
}


exports.softDeleteAccount = async (req, res) => {
    try {
        const userId = req.user.id
        const { password } = req.body

        if (!password)
            return res.status(400).json({ message: "Password is required" })

        const user = await User.findByPk(userId)

        if (!user.verified) {
            return res.status(403).json({
                message: "You have to verify your account to perform this action"
            })
        }

        if (!user)
            return res.status(404).json({ message: "User not found" })

        const match = await bcrypt.compare(password, user.password)
        if (!match)
            return res.status(401).json({ message: "Incorrect password" })

        await user.destroy()

        return res.status(200).json({
            message: "Account has been deleted",
            deletedUserId: userId
        });

    } catch (error) {
        console.error("Soft Delete Error:", error);
        res.status(500).json({ message: "Could not delete account" })
    }
}


exports.updateProfilePicture = async (req, res) => {
  try{
        if(!req.file){ return res.status(400).json({ message: 'No Picture Selected For Upload' }) }

        if (!req.user.verified) {
            return res.status(403).json({
                message: "Please verify your account before updating profile picture"
            });
        }

        let imagePath

        if (process.env.NODE_ENV === 'production') {
          const user = await User.findByPk(req.user.id);
          let oldPublicId = null;
          if (user && user.profilePicture) {
              const match = user.profilePicture.match(/profile-pictures\/(.+)\./)
              if (match) oldPublicId = `profile-pictures/${match[1]}`;
          }

          const result = await uploadToCloud(req.file.buffer);
          imagePath = result.secure_url

          if (oldPublicId) await deleteFromCloud(oldPublicId)
        }
        else
        {
          imagePath = `../uploads/profile-pictures/${req.file.filename}`
        }

        await User.update(
            { profilePicture: imagePath },
            { where: { id: req.user.id } }
        );

        res.status(200).json({
            message: "Profile picture updated successfully",
            profilePicture: imagePath
        })
  }
  catch(error){
    console.error(error)
    res.status(500).json({ message: "Server error" });
  }
}


