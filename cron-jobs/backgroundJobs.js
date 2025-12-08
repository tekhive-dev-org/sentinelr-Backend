const { User, Subscription } = require('../models')
const { Op } = require('sequelize')


exports.autoExpireSubscriptions = async() => {
    const now = new Date();

    await Subscription.update(
      { status: "expired" },
      {
        where: {
          status: "active",
          endDate: { [Op.lt]: now },
        },
      }
    );

    console.log("Expired subscriptions updated");
}

exports.otpCleanUp = async() => {
    try {
    console.log("Running OTP cleanup...");

    await User.update(
      { otp: null, otpExpiredAt: null },
      {
        where: {
          otpExpiredAt: { [Op.lt]: new Date() },
          verified: false
        }
      }
    );

    console.log("OTP cleanup complete");
    } 
    catch (err) {
      console.error("OTP cleanup failed:", err);
    }
}