const axios = require("axios");

async function sendOtpEmail(to, otp) {
  return axios.post(
    "https://techhive-backend-zmq5.onrender.com/api/send/email",
    {
      to,
      subject: "Your OTP",
      html: `<p>Your OTP is <b>${otp}</b></p>`
    }
  )
}

module.exports = {
  sendOtpEmail
}
