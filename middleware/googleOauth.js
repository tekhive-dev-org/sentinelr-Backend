require('dotenv').config()
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const { User, Family, FamilyMember, dbConnection } = require('../models')


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    callbackURL: "https://sentinelr-backend.onrender.com/api/auth/google/callback"

  },
  async (accessToken, refreshToken, profile, done) => {
    const atomic = await dbConnection.transaction()
    try {
      let user = await User.findOne({ where: { email: profile.emails[0].value }, transaction: atomic })

      if (!user) {
        user = await User.create({
          userName: profile.displayName,
          email: profile.emails[0].value,
          verified: true,
          role: 'Parent',
          isLoginEnabled: true
        }, { transaction: atomic })

        const existing = await Family.findOne({ where: { createdBy: user.id }, transaction: atomic })
        if (existing) { 
          await atomic.rollback()
          throw new AppError( 'You already created a family', 400, 'FAMILY_ALREADY_EXISTS' )
        }

        if (user.role === 'Parent') { 
          const family = await Family.create({ familyName: `${user.userName}'s Family`, createdBy: user.id, maxMembers: 2 }, { transaction: atomic }) 
          await FamilyMember.create({ userId: user.id, familyId: family.id, relationship: 'Parent', status: 'Not_Paired' }, { transaction: atomic })
        } 
        else {
          await atomic.rollback()
          throw new AppError('Only parents can create families', 403, 'PARENT_ROLE_REQUIRED') 
        }
      }

      await atomic.commit()
      return done(null, user)
    } 
    catch (err) {
      if (!atomic.finished) { await atomic.rollback() }
      return done(err, null)
    }
  }
))
