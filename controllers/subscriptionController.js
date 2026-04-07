require('dotenv').config()
const { Subscription, Plan} = require('../models/Subscription')
const { Op } = require('sequelize')
const { dbConnection } = require('../models')
const axios = require('axios')
const crypto = require('crypto')



exports.seedPlans = async () => {
  try {
    const plans = [
      {
        slug: 'free',
        displayName: 'Freemium Plan',
        description: 'Best for individuals testing their first plan.',
        monthlyPrice: 0,
        annualPrice: 0,
        currency: 'NGN',
        trialDays: 14,
        features: [
          'Full Security',
          'Limited to just one device',
          'Including intruder alerts & history'
        ],
        durationDays: 30,
        maxDevices: 1,
        featured: false
      },
      {
        slug: 'personal',
        displayName: 'Personal Plan',
        description: 'Best for small families.',
        monthlyPrice: 25,
        annualPrice: 250,
        currency: 'NGN',
        features: [
          'Full Security',
          'Connect Up To 4 Devices',
          'Tasks After a Session',
          'Access To Prebuilt Templates'
        ],
        durationDays: 30,
        maxDevices: 4,
        featured: true
      },
      {
        slug: 'family',
        displayName: 'Family Plan',
        description: 'Best for large families.',
        monthlyPrice: 40,
        annualPrice: null,
        currency: 'NGN',
        isCustomPricing: true,
        features: [
          'Full Security',
          'Connect More Than 5 Devices',
          'Including Intruder Alerts & History',
          'Priority Email Support'
        ],
        durationDays: 30,
        maxDevices: null,
        featured: false
      }
    ]

    for (const plan of plans) { await Plan.upsert(plan) }
    console.log('Plans seeded successfully')
  } 
  catch (error) {
    console.error('Error seeding plans:', error)
  }
}


exports.createOrRenewSubscription = async (req, res, next) => {
  const transaction = await dbConnection.transaction()

  try {
    const { planId, paymentReference } = req.body
    const userId = req.user.id

    const plan = await Plan.findByPk(planId)

    if (!plan) {
      await transaction.rollback()
      return res.status(400).json({ message: 'Invalid plan.' })
    }

    // TODO: verify Paystack payment here

    // Expire any active subscription
    await Subscription.update(
      { status: 'expired' },
      { where: { userId, status: 'active' }, transaction }
    )

    const now = new Date()
    const endDate = new Date(now)
    endDate.setDate(now.getDate() + plan.durationDays)

    const subscription = await Subscription.create(
      {
        userId,
        planId,
        startDate: now,
        endDate,
        amount: plan.monthlyPrice,
        status: 'active',
        paymentReference
      },
      { transaction }
    )

    await transaction.commit()

    res.status(200).json({
      message: 'Subscription successful',
      subscription
    })

  } catch (error) {
    await transaction.rollback()
    next(error)
  }
}


exports.getSubscriptionPlans = async (req, res) => {
  try {
    const plans = await Plan.findAll()

    const formattedPlans = plans.map(plan => ({
      id: plan.slug || plan.name.toLowerCase(),
      name: plan.displayName || plan.name,
      description: plan.description,
      monthlyPrice: plan.monthlyPrice,
      annualPrice: plan.annualPrice,
      currency: plan.currency,
      features: plan.features,
      maxDevices: plan.maxDevices,
      trialDays: plan.trialDays,
      isCustomPricing: plan.isCustomPricing,
      featured: plan.featured
    }))

    res.json({ success: true, plans: formattedPlans })
  } 
  catch (error) { res.status(500).json({ success: false, error: error.message }) }
}


exports.getCurrentSubscription = async (req, res) => {
  try {
    const userId = req.user.id

    const subscription = await Subscription.findOne({
      where: { userId, status: 'active' },
      include: [{ model: Plan }]
    })

    if (!subscription) { return res.json({ success: true, subscription: null }) }

    const response = {
      id: subscription.id,
      planId: subscription.Plan.slug || subscription.Plan.name.toLowerCase(),
      planName: subscription.Plan.displayName || subscription.Plan.name,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      currentPeriodStart: subscription.startDate,
      currentPeriodEnd: subscription.endDate,
      amount: subscription.amount,
      currency: subscription.currency,
      autoRenew: subscription.autoRenew,
      paymentMethod: subscription.paymentMeta?.method || null
    }

    res.json({ success: true, subscription: response })
  } 
  catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}


exports.renewSubscription = async (req, res, next) => {
  const transaction = await dbConnection.transaction()

  try {
    const userId = req.user.id
    const subscription = await Subscription.findOne({
      where: { userId, status: 'active' },
      include: [Plan],
      transaction
    })

    if (!subscription) {
      await transaction.rollback()
      return res.status(404).json({ message: 'No active subscription found' })
    }

    if (subscription.cancelAtPeriodEnd) {
      await transaction.rollback()
      return res.status(400).json({ message: 'Subscription is set to cancel at period end and cannot be renewed' })
    }

    const plan = subscription.Plan
    const now = new Date()
    const newEndDate = new Date(subscription.endDate)
    newEndDate.setDate(subscription.endDate.getDate() + plan.durationDays)

    subscription.startDate = now
    subscription.endDate = newEndDate
    subscription.status = 'active'
    subscription.canceledAt = null 
    await subscription.save({ transaction })

    await transaction.commit()

    res.json({
      success: true,
      message: 'Subscription renewed successfully',
      subscription
    })
  } 
  catch (error) {
    await transaction.rollback()
    next(error)
  }
}



exports.cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id
    const { reason, feedback } = req.body

    const subscription = await Subscription.findOne({ where: { userId, status: 'active' } })
    if (!subscription) { return res.status(404).json({ success: false, message: 'No active subscription found' }) }

    subscription.cancelAtPeriodEnd = true
    subscription.cancelReason = reason
    subscription.cancelFeedback = feedback
    subscription.cancelledAt = new Date()
    await subscription.save()

    res.json({
      success: true,
      message: 'Subscription will be cancelled at the end of the current billing period',
      endsAt: subscription.endDate
    })
  } 
  catch (error) { 
    res.status(500).json({ success: false, error: error.message }) 
  }
}


exports.initiatePaystackPayment = async (req, res) => {
  try {
    const userId = req.user.id
    const { planId, billingCycle, returnUrl, cancelUrl } = req.body

    const plan = await Plan.findOne({ where: { slug: planId } })
    if (!plan) { return res.status(400).json({ success: false, message: 'Invalid plan.' }) }

    let amount
    if (billingCycle === 'monthly') { amount = parseInt(plan.monthlyPrice, 10) }
    else if (billingCycle === 'annual') { amount = parseInt(plan.annualPrice, 10) } 
    else { return res.status(400).json({ success: false, message: 'Invalid billing cycle.' }) }

    const amountInKobo = amount * 100

    const response = await axios.post('https://api.paystack.co/transaction/initialize',
      {
        email: req.user.email,
        amount: amountInKobo,
        callback_url: returnUrl,
        channels: ['card', 'ussd', 'bank_transfer'],
        metadata: { cancel_url: cancelUrl, userId, planId, billingCycle }
      },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' } }
    )

    const data = response.data
    if (!data.status) { return res.status(400).json({ success: false, message: 'Payment initialization failed.' }) }

    res.json({
      success: true,
      redirectUrl: data.data.authorization_url,
      orderId: data.data.reference,
      accessCode: data.data.access_code
    })
  } 
  catch (error) {
    console.error('Paystack init error:', error.response?.data || error.message)
    res.status(500).json({ success: false, error: 'Unable to initiate payment' })
  }
}


exports.verifyTransaction = async (req, res) => {
  try {
    const { reference } = req.params
    const userId = req.user.id

    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    )

    const data = response.data
    if (!data.status || data.data.status !== 'success') {
      console.log(data)
      return res.status(400).json({ success: false, message: 'Payment not successful' })
    }

    const subscription = await Subscription.findOne({ where: { paymentReference: reference, userId } })
    if (!subscription) { return res.status(404).json({ success: false, message: 'Subscription not found' }) }

    subscription.status = 'active'
    subscription.paymentReference = reference
    subscription.paymentChannel = data.data.authorization.channel
    subscription.paymentBank = data.data.authorization.bank
    subscription.paymentCardType = data.data.authorization.card_type
    subscription.authorizationCode = data.data.authorization.authorization_code
    subscription.paymentLast4 = data.data.authorization.last4
    subscription.paymentBrand = data.data.authorization.brand
    subscription.paymentExpMonth = data.data.authorization.exp_month
    subscription.paymentExpYear = data.data.authorization.exp_year
    await subscription.save()

    res.json({ success: true, message: 'Payment verified and subscription activated', subscription })
  } 
  catch (error) {
    console.error(error.response?.data || error.message)
    res.status(500).json({ success: false, error: 'Verification failed' })
  }
}


exports.chargeAuthorization = async (req, res) => {
  try {
    const userId = req.user.id

    const subscription = await Subscription.findOne({
      where: { userId, status: 'active' },
      include: [Plan]
    })

    if (!subscription || !subscription.authorizationCode) {
      return res.status(400).json({ success: false, message: 'No reusable authorization found' })
    }

    const plan = subscription.Plan
    const amount = subscription.billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice
    const amountInKobo = amount * 100

    const response = await axios.post('https://api.paystack.co/transaction/charge_authorization',
      {
        authorization_code: subscription.authorizationCode,
        email: req.user.email,
        amount: amountInKobo
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const data = response.data
    if (!data.status || data.data.status !== 'success') {
      return res.status(400).json({ success: false, message: 'Charge failed' })
    }

    const newEndDate = new Date(subscription.endDate)
    newEndDate.setDate(newEndDate.getDate() + plan.durationDays)

    subscription.endDate = newEndDate
    subscription.paymentReference = data.data.reference
    await subscription.save()

    res.json({ success: true, message: 'Subscription renewed via saved card', subscription })
  } catch (error) {
    console.error(error.response?.data || error.message)
    res.status(500).json({ success: false, error: 'Charge authorization failed' })
  }
}

exports.paystackWebhook = async (req, res) => {
  try {
    console.log('Webhook received:', JSON.stringify(req.body, null, 2))
    const secret = process.env.PAYSTACK_SECRET_KEY
    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex')

    if (hash !== req.headers['x-paystack-signature']) { return res.status(400).send('Invalid signature') }
    const event = req.body

    if (event.event === 'charge.success') {
      const reference = event.data.reference
      const userEmail = event.data.customer.email

      const user = await User.findOne({ where: { email: userEmail } })
      if (!user) {
        console.error('Webhook: user not found for email', userEmail)
        return res.sendStatus(200)
      }

      const planId = event.data.metadata?.planId
      const plan = await Plan.findByPk(planId)
      if (!plan) {
        console.error('Webhook: plan not found for id', planId)
        return res.sendStatus(200)
      }

      await Subscription.update({ status: 'expired' }, { where: { userId: user.id, status: 'active' } })

      // const subscription = await Subscription.findOne({ where: { orderId: reference } })
      // if (subscription) {
      //   subscription.status = 'active'
      //   subscription.paymentReference = reference
      //   subscription.paymentMethodType = event.data.authorization.card_type
      //   subscription.paymentLast4 = event.data.authorization.last4
      //   subscription.paymentBrand = event.data.authorization.brand
      //   await subscription.save()
      // }

      const subscription = await Subscription.create({
          userId: user.id,
          planId: plan.id,
          startDate: now,
          endDate,
          amount: event.data.metadata?.billingCycle == 'monthly' ? plan.monthlyPrice : plan.annualPrice,
          status: 'active',
          orderId: reference,
          paymentReference: reference,
          paymentMethodType: event.data.authorization.card_type,
          paymentLast4: event.data.authorization.last4,
          paymentBrand: event.data.authorization.brand,
          authorizationCode: event.data.authorization?.reusable ? event.data.authorization?.authorization_code : null
      })

      console.log('Webhook: subscription created', subscription.id)
    }

    res.sendStatus(200)
  } 
  catch (error) {
    console.error('Webhook error:', error.message)
    res.sendStatus(500)
  }
}


exports.expireSubscriptions =  async()  => {
  const now = new Date()
  await Subscription.update({ status: 'expired' }, { where: { status: 'active', endDate: { [Op.lt]: now } } } )
}





