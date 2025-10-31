require('dotenv').config()
const nodemailer = require('nodemailer')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const bcrypt = require('bcrypt')
const { User, dbConnection } = require('../models')



exports.login = async(req, res, next) => {
    try{
        const { email, password } = req.body

        const user = await User.findOne({ where: { email } })
        if(!user){ return res.status(404).json({ message: "User Not Found !" }) }

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
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000)

    const newUser = await User.create({
      userName,
      email,
      password,
      otp: hashedOtp, 
      otpExpiresAt, 
      verified: false,
      role: role || 'Personal'
    }, { transaction: atomic })

    const regToken = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    await atomic.commit()

    await sendEmailOTP(newUser.email, otp)

    return res.status(201).json({
      message: 'User registered successfully.\n Please Verify Your Email',
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

    if (!otp) {
      return res.status(400).json({ message: 'OTP is required.' });
    }

    const { email } = req.user;

    if (!email) {
      return res.status(400).json({ message: 'Invalid token payload: missing email.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.verified) {
      return res.status(400).json({ message: 'User already verified.' });
    }

    const isMatch = await bcrypt.compare(otp, user.otp);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    if (new Date() > new Date(user.otpExpiresAt)) {
      return res.status(400).json({ message: 'OTP expired.' });
    }

    user.verified = true;
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    return res.status(200).json({ message: 'Email verified successfully.' });
  } 
  catch (error) {
    console.error('Error verifying OTP:', error);
    next(error);
  }
};






function generateOtp(length = 6){
    const generatedOtp = crypto.randomInt(0, Math.pow(10, length)).toString().padStart(length, '0')
    return generatedOtp
}

async function hashOtp(otp) {
    const saltRounds = 10
    const hashedOtp = await bcrypt.hash(otp, saltRounds)
    return hashedOtp
}

async function sendEmailOTP(toEmail, otp) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  })

  await transporter.sendMail({
    from: `Sentinelr  <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'Verify Your Account',
    text: `Your OTP for account verification is ${otp}. It expires in 10 minutes.`
  })
}

