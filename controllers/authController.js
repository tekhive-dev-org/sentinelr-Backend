require('dotenv').config()
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const bcrypt = require('bcrypt')
const { User, Family, FamilyMember, Device, dbConnection } = require('../models')
const { Op } = require('sequelize')
const axios = require("axios")
const { sendOtpEmail } = require("../services/emailService");
const { uploadToCloud, deleteFromCloud }= require('../middleware/cloudinary')





exports.createFirstSuperAdmin = async () => {
    try {

        const existing = await User.findOne({ where: { role: "SuperAdmin" } });

        if (!existing) {
            await User.create({
                userName: "Super Admin",
                email: process.env.SUPER_ADMIN_EMAIL,
                password: process.env.SUPER_ADMIN_PASSWORD,
                role: "SuperAdmin",
 		verified: true
            });

            console.log("✔ First super admin created");
        } else {
            console.log("✔ Super admin already exists");
        }

    } catch (error) {
        console.error("❌ Error creating first super admin:", error);
        throw error;
    }
};


exports.login = async(req, res, next) => {
    try{
        const { email, password } = req.body

        const user = await User.findOne({ where: { email } })
        if(!user){ return res.status(404).json({ message: "User Not Found !" }) }

        if (!user.verified) { return res.status(403).json({ message: 'Please verify your email before logging in' })}

        const match = await bcrypt.compare(password, user.password)
        if(!match){ return res.status(401).json({ message: "Invalid Password !" }) }

        const token = jwt.sign(
            { userId: user.id, userRole: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        )

        res.status(200).json({ message: 'Login Successfull.', token })
    }
    catch(error){
        console.error(error)
        next(error)
    }
}


exports.register = async (req, res, next) => {
  const atomic = await dbConnection.transaction()
  try {
    const { userName, email, password, confirmPassword, role } = req.body

    if (!userName || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required.' })
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' })
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[a-zA-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          'Password Must Contain At Least One Uppercase Letter, One Number And One Special Character.'
      })
    }

    const existingUser = await User.findOne({ where: { email }, transaction: atomic })
    if (existingUser) {
      await atomic.rollback()
      return res.status(409).json({ message: 'Email is already registered.' })
    }

    const otp = generateOtp()
    const hashedOtp = await hashOtp(otp)
    const otpExpiredAt = new Date(Date.now() + 10 * 60 * 1000)

    const newUser = await User.create({
      userName,
      email,
      password,
      otp: hashedOtp, 
      otpExpiredAt, 
      verified: false,
      role: role || 'Personal'
    }, { transaction: atomic })

    const regToken = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    await sendOtpEmail(newUser.email, otp)

    await atomic.commit()

    return res.status(201).json({
      message: 'User registered successfully. Please Verify Your Email',
      user: {
        id: newUser.id,
        userName: newUser.userName,
        email: newUser.email,
        role: newUser.role
      },
      regToken
    })
  } 
  catch (error) {
    await atomic.rollback()
    console.error(error)
    next(error)
  }
}


exports.verifyOTP = async (req, res, next) => {
  try {
    const { otp } = req.body;

    // if (!otp) {
    //   return res.status(400).json({ message: 'OTP is required.' });
    // }

    // const { email } = req.user;
    let email

    if (req.user) { email = req.user.email } 
    else { email = req.body.email }

    if (!email) {
      return res.status(400).json({ message: 'Missing email.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.verified) {
      return res.status(400).json({ message: 'User already verified.' });
    }

    if (new Date() > new Date(user.otpExpiredAt)) {
      user.otp = null;
      user.otpExpiredAt = null;
      await user.save();
      return res.status(400).json({ message: 'OTP expired.' });
    }

    const isMatch = await bcrypt.compare(otp, user.otp);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }
    

    user.verified = true;
    user.otp = null;
    user.otpExpiredAt = null;
    await user.save();

    return res.status(200).json({ message: 'Email verified successfully.' });
  } 
  catch (error) {
    console.error('Error verifying OTP:', error);
    next(error);
  }
}

exports.resetPassword = async (req, res, next) => {
  const atomic = await dbConnection.transaction()
  try {
    const { email, otp, newPassword, confirmPassword } = req.body

    // if (!req.user.verified) {
    //         return res.status(403).json({
    //             message: "You need to verify your account"
    //         });
    // }

    if (email && !otp && !newPassword && !confirmPassword) {
      const user = await User.findOne({ where: { email }, transaction: atomic })

      if (!user.verified) {
            return res.status(403).json({
                message: "You have to verify your account to perform this action"
            })
      }

      if (!user) {
        await atomic.rollback()
        return res.status(404).json({ message: 'User not found.' })
      }

      const generatedOtp = generateOtp()
      const hashedOtp = await hashOtp(generatedOtp)
      const otpExpiredAt = new Date(Date.now() + 10 * 60 * 1000)

      await user.update(
        { otp: hashedOtp, otpExpiredAt },
        { transaction: atomic }
      )
      await atomic.commit()

      // await sendEmailOTP(email, generatedOtp)
      await axios.post("https://techhive-backend-zmq5.onrender.com/api/send/email", {
        to: email,
        subject: "Your OTP",
        html: `<p>Your OTP is <b>${generatedOtp}</b></p>`
      })

        return res.status(200).json({
        message: 'OTP sent to your email. Please verify to reset your password.'
      })
    }

    if (otp && newPassword && confirmPassword && !email) {
        const users = await User.findAll({
            where: {
                verified: true,
                otp: { [Op.ne]: null },
                otpExpiredAt: { [Op.gt]: new Date() }
            },
            transaction: atomic
        });

        let matchedUser = null;

        for (const usr of users) {
            const isOtpValid = await bcrypt.compare(otp, usr.otp);
            if (isOtpValid) {
                matchedUser = usr;
                break;
            }
        }

        if (!matchedUser) {
            await atomic.rollback();
            return res.status(404).json({
                message: 'No reset request found or OTP expired.'
            });
        }

        if (matchedUser.otpExpiredAt < new Date()) {
            await atomic.rollback();
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match.' });
        }

        const passwordRegex =
            /^(?=.*[A-Z])(?=.*[0-9])(?=.*[a-zA-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                message:
                    'Password must contain at least one uppercase letter, one number, and one special character.'
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)

        await matchedUser.update(
            { password: hashedPassword, otp: null, otpExpiredAt: null },
            { transaction: atomic }
        );

        await atomic.commit();
        return res.status(200).json({ message: 'Password reset successfully.' });
    }

    return res.status(400).json({
      message:
        'Invalid request. Provide only email to request reset, or otp + new passwords to complete reset.'
    })
  } 
  catch (error) {
    await atomic.rollback()
    console.error(error)
    next(error)
  }
}

// exports.sendOtpEmail = async (req, res) => {
//   const atomic = await dbConnection.transaction()
//   const OTP_LIFETIME = 10 * 60 * 1000
//   const COOLDOWN = 2 * 60 * 1000

//   try {
//     const user = req.user;

//     if (!user || !user.email) {
//       return res.status(401).json({ error: "You need to register" });
//     }

//     if (user.verified) {
//       return res.status(400).json({ message: "User already verified" })
//     }

//     if (user.otpExpiredAt) {
//       const otpCreatedAt = user.otpExpiredAt.getTime() - OTP_LIFETIME
//       if (Date.now() - otpCreatedAt < COOLDOWN) { 
//         return res.status(429).json({ message: 'Please wait 2 minutes before requesting another OTP' })
//       }
//     }

//     const otp = generateOtp()
//     const hashedOtp = await hashOtp(otp)

//     const otpExpiredAt = new Date(Date.now() + 10 * 60 * 1000)

//     await user.update(
//       { otp: hashedOtp, otpExpiredAt },
//       { transaction: atomic }
//     );
//     await atomic.commit();

//     await sendOtpEmail(user.email, otp);

//     return res.status(200).json({ message: "OTP email sent" });
//   } catch (err) {
//     console.error("sendOtpEmailApi error:", err);

//     // Rollback transaction if it exists
//     if (atomic) await atomic.rollback();

//     return res.status(500).json({ error: "Failed to send email" });
//   }
// }

exports.sendOtpEmail = async (req, res) => {
  const atomic = await dbConnection.transaction()
  const OTP_LIFETIME = 10 * 60 * 1000
  const COOLDOWN = 2 * 60 * 1000

  try {
    let user = null;

    if (req.user) { user = req.user }

    if (!user) {
      const { email } = req.body

      if (!email) {
        return res.status(400).json({
          error: "Authentication or email is required"
        })
      }

      user = await User.findOne({
        where: { email },
        transaction: atomic
      })

      if (!user) {
        await atomic.commit();
        return res.status(200).json({
          message: "If this email exists, an OTP has been sent"
        })
      }
    }

    if (user.verified) {
      await atomic.commit();
      return res.status(400).json({
        message: "User already verified"
      })
    }

    if (user.otpExpiredAt) {
      const otpCreatedAt = user.otpExpiredAt.getTime() - OTP_LIFETIME

      if (Date.now() - otpCreatedAt < COOLDOWN) {
        await atomic.commit();
        return res.status(429).json({ message: "Please wait before requesting another OTP" })
      }
    }

    const otp = generateOtp()
    const hashedOtp = await hashOtp(otp)
    const otpExpiredAt = new Date(Date.now() + OTP_LIFETIME)

    await user.update( { otp: hashedOtp, otpExpiredAt }, { transaction: atomic })
    await atomic.commit()

    try{ await sendOtpEmail(user.email, otp) }
    catch(emailErr){ console.error("Email failed:", emailErr) }

    return res.status(200).json({ message: "OTP email sent" })

  } 
  catch (err) {
    if (atomic) await atomic.rollback()
    console.error("sendOtpEmail error:", err)
    return res.status(500).json({ error: "Failed to send OTP" })
  }
}


exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'userName', 'email', 'role', 'verified', 'blocked', 'createdAt'],
      order: [['createdAt', 'DESC']]
    })

    return res.status(200).json({
      count: users.length,
      users
    })
  } catch (error) {
    console.error(error)
    next(error)
  }
}

exports.getLoggedInUserById = async (req, res, next) => {
  try {
    console.log('REQ.USER:', req.user)
    const authenticatedUser = req.user

    const user = await User.findByPk(authenticatedUser.id, {
      attributes: ['id', 'userName', 'email', 'role', 'verified', 'phone', 'profilePicture', 'createdAt']
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    return res.status(200).json({
      message: 'User fetched successfully',
      user
    })
  } catch (error) {
    console.error(error)
    next(error)
  }
}

exports.getUserByEmail = async (req, res, next) => {
  try {
    const { email } = req.query

    if (!email) {
      return res.status(400).json({ message: 'Email is required' })
    }

    const user = await User.findOne({
      where: { email },
      attributes: ['id', 'userName', 'email', 'role', 'verified']
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    return res.status(200).json({ user })
  } 
  catch (error) {
    console.error(error)
    next(error)
  }
}

exports.blockUser = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { action } = req.body

    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    if (!["block", "unblock"].includes(action)) {
      return res.status(400).json({
        message: "Invalid action. Use 'block' or 'unblock'."
      })
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (req.user && req.user.id === user.id) {
      return res.status(400).json({
        message: "You cannot block your own account."
      });
    }

    const shouldBlock = action === "block";

    if (user.blocked === shouldBlock) {
      return res.status(400).json({
        message: `User is already ${shouldBlock ? "blocked" : "unblocked"}.`
      });
    }

    await user.update({ blocked: shouldBlock });

    return res.status(200).json({
      message: `User has been successfully ${shouldBlock ? "blocked" : "unblocked"}.`,
      user: {
        id: user.id,
        userName: user.userName,
        email: user.email,
        role: user.role,
        blocked: user.blocked
      }
    });
  } catch (error) {
    console.error("Error blocking user:", error);
    next(error);
  }
}

exports.getAllBlockedUsers = async (req, res, next) => {
  try {
    const { blocked } = req.query
    const isBlocked = blocked === 'false' ? false : true

    const blockedUsers = await User.findAll({
      where: { blocked: isBlocked },
      attributes: ['id', 'userName', 'email', 'role', 'blocked', 'createdAt'],
      order: [['createdAt', 'DESC']]
    })

    return res.status(200).json({
      count: blockedUsers.length,
      blockedUsers
    })
  } catch (error) {
    console.error(error)
    next(error)
  }
}

exports.getAllVerifiedUsers = async (req, res, next) => {
  try {
    const { verified } = req.query
    const isVerified = verified === 'false' ? false : true

    const verifiedUsers = await User.findAll({
      where: { verified: isVerified },
      attributes: ['id', 'userName', 'email', 'role', 'verified', 'createdAt'],
      order: [['createdAt', 'DESC']]
    })

    return res.status(200).json({
      count: verifiedUsers.length,
      verifiedUsers
    })
  } catch (error) {
    console.error(error)
    next(error)
  }
}

exports.restoreDeletedAccount = async (req, res) => {
    try {
        const { userId } = req.params
        const user = await User.findOne({ where: { id: userId }, paranoid: false })

        if (!user) { return next(new AppError('User not found', 404, 'USER_NOT_FOUND')) }

        if (!user.deletedAt) { return next(new AppError('User account is already active', 400, 'USER_NOT_DELETED')) }

        await user.restore()
        return res.status(200).json({ message: "Account Restored Succesfully" })
    } 
    catch (error) {
        throw error
    }
}








function generateOtp(length = 6){
    const generatedOtp = crypto.randomInt(0, Math.pow(10, length)).toString().padStart(length, '0')
    return generatedOtp
}

async function hashOtp(otp) {
    const saltRounds = 10
    const hashedOtp = await bcrypt.hash(otp, saltRounds)
    return hashedOtp
}



// async function sendEmailOTP(toEmail, otp) {
//   const transporter = nodemailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: process.env.SMTP_PORT,
//     auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
//   })

//   await transporter.sendMail({
//     from: `Sentinelr  <${process.env.SMTP_USER}>`,
//     to: toEmail,
//     subject: 'Verify Your Account',
//     text: `Your OTP for account verification is ${otp}. It expires in 10 minutes.`
//   })
// }


