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

exports.updateFamilyMemberProfile = catchAsync(async (req, res) => {
  const transaction = await dbConnection.transaction();

  try {
    const loggedInUser = req.user;
    const loggedInUserId = loggedInUser.id;
    const targetUserId = Number(req.params.userId);

    const { userName, email, phone } = req.body;

    const targetUser = await User.findByPk(targetUserId, { transaction });

    if (!targetUser) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    if (!targetUser.verified) {
      throw new AppError(
        "Please verify your account before updating your profile",
        403,
        "ACCOUNT_NOT_VERIFIED"
      );
    }

    // ---------------------------------------------------
    // Authorization
    // ---------------------------------------------------

    // User editing own profile
    if (loggedInUserId !== targetUserId) {

      // Only parents can edit someone else's profile
      if (loggedInUser.role !== "Parent") {
        throw new AppError(
          "You are not allowed to update this profile",
          403,
          "NOT_AUTHORIZED"
        );
      }

      // Parent must own the family
      const family = await Family.findOne({
        where: {
          createdBy: loggedInUserId,
        },
        transaction,
      });

      if (!family) {
        throw new AppError(
          "Family not found",
          404,
          "FAMILY_NOT_FOUND"
        );
      }

      // Target user must belong to parent's family
      const member = await FamilyMember.findOne({
        where: {
          familyId: family.id,
          userId: targetUserId,
        },
        transaction,
      });

      if (!member) {
        throw new AppError(
          "User is not a member of your family",
          403,
          "NOT_FAMILY_MEMBER"
        );
      }

      // Optional safety:
      // Parents can only edit Members.
      if (targetUser.role !== "Member") {
        throw new AppError(
          "Parents can only edit member profiles",
          403,
          "INVALID_TARGET"
        );
      }
    }

    // ---------------------------------------------------
    // Email uniqueness
    // ---------------------------------------------------

    if (email && email !== targetUser.email) {
      const existingEmail = await User.findOne({
        where: {
          email,
          id: {
            [Op.ne]: targetUser.id,
          },
        },
        transaction,
      });

      if (existingEmail) {
        throw new AppError(
          "Email already in use",
          400,
          "EMAIL_ALREADY_EXISTS"
        );
      }
    }

    const updatedFields = {
      id: targetUser.id,
    };

    if (userName && userName !== targetUser.userName) {
      targetUser.userName = userName;
      updatedFields.userName = userName;
    }

    if (email && email !== targetUser.email) {
      targetUser.email = email;
      updatedFields.email = email;
    }

    if (phone && phone !== targetUser.phone) {
      targetUser.phone = phone;
      updatedFields.phone = phone;
    }

    await targetUser.save({ transaction });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      updated: updatedFields,
    });

  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }
});


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
          imagePath = result

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


