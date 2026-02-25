require('dotenv').config()
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const User = require('../models/User')


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    callbackURL: "https://sentinelr-backend.onrender.com/api/auth/google/callback"

  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ where: { email: profile.emails[0].value } })

      if (!user) {
        user = await User.create({
          userName: profile.displayName,
          email: profile.emails[0].value,
          verified: true,
          role: 'Parent',
          isLoginEnabled: true
        })
      }

      return done(null, user)
    } catch (err) {
      return done(err, null)
    }
  }
))
