const Subscription = require('../models/Subscription')
const { Op } = require('sequelize')
const dbConnection = require('../config/db')


const PLAN_DETAILS = {
  person: { price: 10, durationDays: 30 },
  familyOf5: { price: 25, durationDays: 30 },
  familyOf10: { price: 40, durationDays: 30 }
}


exports.createOrRenewSubscription = async (req, res, next) => {
  const transaction = await dbConnection.transaction()
  try {
    const { type } = req.body
    const userId = req.user.id

    if (!PLAN_DETAILS[type]) {
      await transaction.rollback()
      return res.status(400).json({ message: 'Invalid subscription type.' })
    }

    const { price, durationDays } = PLAN_DETAILS[type]
    const now = new Date()
    const endDate = new Date(now)
    endDate.setDate(now.getDate() + durationDays)

    let subscription = await Subscription.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']]
    })

    if (subscription && subscription.status === 'active' && subscription.endDate > now) {

      await subscription.update(
        {
          status: 'renewed',
          startDate: now,
          endDate,
          amount: price
        },
        { transaction }
      )
    } 
    else {
      subscription = await Subscription.create(
        {
          userId,
          type,
          startDate: now,
          endDate,
          amount: price,
          status: 'active'
        },
        { transaction }
      )
    }

    await transaction.commit()
    res.status(200).json({ message: 'Subscription successful', subscription })
  } catch (error) {
    await transaction.rollback()
    next(error)
  }
}


exports.getSubscriptionSummary = async (req, res, next) => {
  try {
    const total = await Subscription.count()
    const active = await Subscription.count({ where: { status: 'active' } })
    const renewed = await Subscription.count({ where: { status: 'renewed' } })
    const expired = await Subscription.count({ where: { status: 'expired' } })

    res.status(200).json({ total, active, renewed, expired })
  } catch (error) {
    next(error)
  }
}


exports.getUserSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id
    const subscription = await Subscription.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']]
    })

    if (!subscription) {
      return res.status(404).json({ message: 'No subscription found.' })
    }

    res.status(200).json({ subscription })
  } catch (error) {
    next(error)
  }
}


exports.changeSubscriptionType = async (req, res, next) => {
  const transaction = await dbConnection.transaction()
  try {
    const userId = req.user.id
    const { newType } = req.body

    if (!PLAN_DETAILS[newType]) {
      await transaction.rollback()
      return res.status(400).json({ message: 'Invalid subscription type.' })
    }

    const subscription = await Subscription.findOne({
      where: { userId, status: 'active' },
      order: [['createdAt', 'DESC']]
    })

    if (!subscription) {
      await transaction.rollback()
      return res.status(404).json({ message: 'No active subscription found.' })
    }

    const { price, durationDays } = PLAN_DETAILS[newType]
    const now = new Date()
    const endDate = new Date(now)
    endDate.setDate(now.getDate() + durationDays)

    await subscription.update(
      { type: newType, amount: price, startDate: now, endDate },
      { transaction }
    )

    await transaction.commit()
    res.status(200).json({ message: 'Subscription updated successfully', subscription })
  } catch (error) {
    await transaction.rollback()
    next(error)
  }
}

exports.cancelSubscription = async (req, res, next) => {
  const transaction = await dbConnection.transaction();
  
  try {
    const userId = req.user.id;
    const now = new Date();

    const subscription = await Subscription.findOne({
      where: { userId, status: 'active', endDate: { [Op.gt]: now } },
      order: [['createdAt', 'DESC']]
    });

    if (!subscription) {
      await transaction.rollback();
      return res.status(404).json({ message: 'No active subscription found to cancel.' });
    }

    await subscription.update(
      { 
        status: 'cancelled',
        endDate: now 
      },
      { transaction }
    );

    await transaction.commit();
    
    res.status(200).json({ message: 'Subscription successfully cancelled.', subscription });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

