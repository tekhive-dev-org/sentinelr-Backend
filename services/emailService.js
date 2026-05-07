const axios = require("axios");

async function sendEmail(to, subject, html) {
  return axios.post(
    "https://techhive-backend-zmq5.onrender.com/api/send/email",
    {
      to,
      subject,
      html
    }
  )
}

module.exports = {
  sendEmail
}
