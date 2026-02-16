require('dotenv').config()
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/AppError')
const { dbConnection, Family, FamilyMember, User } = require('../models')


exports.createFamily = catchAsync(async (req, res, next) => {
  const transaction = await dbConnection.transaction()
  try {
    const { familyName } = req.body
    const userId = req.user.id

    if (!req.user.verified) { throw new AppError('Please verify your account', 403, 'ACCOUNT_NOT_VERIFIED') }
    if (req.user.role !== 'Parent') { throw new AppError('Only parents can create families', 403,'PARENT_ROLE_REQUIRED') }
    if (!familyName) { throw new AppError('Family name is required', 400,'FAMILY_NAME_REQUIRED') }

    const existing = await Family.findOne({ where: { createdBy: userId }, transaction })
    if (existing) { throw new AppError('You already created a family', 400,'FAMILY_ALREADY_EXISTS') }

    const family = await Family.create({ familyName, createdBy: userId }, { transaction })
    await FamilyMember.create( { userId, familyId: family.id, relationship: 'Parent' }, { transaction } )

    await transaction.commit()
    res.status(201).json({ success: true, message: 'Family created successfully.', family })
  } 
  catch (error) {
    if (!transaction.finished) { await transaction.rollback() }
    throw error
  }
})

exports.addMemberToFamily = catchAsync(async (req, res, next) => {
  const transaction = await dbConnection.transaction()
  try {
    const { familyId, userId } = req.body
    const parentId = req.user.id

    if (!req.user.verified) { throw new AppError('Please verify your account', 400,'ACCOUNT_NOT_VERIFIED') }
    if (req.user.role !== 'Parent') { throw new AppError('Only parents can add family members', 403,'PARENT_ROLE_REQUIRED') }

    const family = await Family.findByPk(familyId, { transaction })
    if (!family) { throw new AppError('Family not found', 403,'FAMILY_NOT_FOUND') }

    if (family.createdBy !== parentId) {
      await transaction.rollback()
      throw new AppError('You are not allowed to modify this family', 403,'NOT_FAMILY_OWNER')
    }

    const memberExists = await FamilyMember.findOne({ where: { userId, familyId }, transaction })
    if (memberExists) { throw new AppError('User is already a family member', 400,'FAMILY_MEMBER_EXISTS') }

    const memberToBeAdded = await User.findOne({ where: { id: userId }}, transaction)
    if (!memberToBeAdded) { throw new AppError('User not found', 404, 'USER_NOT_FOUND') }
    if(memberToBeAdded.role !== 'Member'){ throw new AppError("Only users with a role of 'Member' can be added to a family", 400) }

    await FamilyMember.create({ userId, familyId, relationship: 'Member', status: 'Not_Paired' }, { transaction })
    await transaction.commit()

    res.status(201).json({ message: 'Member added successfully.' })
  } 
  catch (error) {
    if (!transaction.finished) { await transaction.rollback() }
    throw error
  }
})

exports.viewFamilyMembers = catchAsync(async (req, res, next) => {
  try {
    const userId = req.user.id

    if (!req.user.verified) { throw new AppError('Please verify your account', 403, 'ACCOUNT_NOT_VERIFIED') }

    const isMember = await FamilyMember.findOne({ where: { userId }})
    if (!isMember) { throw new AppError('Not authorized to view this family', 403,'NOT_AUTHORIZED') }

    const family = await Family.findByPk(isMember.familyId, {
      include: [
        {
          model: User,
          as: 'members',
          attributes: ['id', 'userName', 'email', 'phone'],
          through: { attributes: ['relationship'] }
        }
      ]
    })

    if (!family) { return res.status(404).json({ message: 'Family not found.' }) }

    res.status(200).json({ family })
  } 
  catch (error) {
    throw error
  }
})

exports.createChildUser = catchAsync(async (req, res, next) => {
  const atomic = await dbConnection.transaction()

  try {
    const parent = req.user
    const { userName, email, phone } = req.body

    if (parent.role !== 'Parent') { throw new AppError('Only parents can create members', 403,'CANNOT_CREATE_MEMBER') }
    if (!userName || !email) { throw new AppError('All fields are required', 403,'INCOMPLETE_FIELDS')}
    
    const existingUser = await User.findOne({ where: { email }, transaction: atomic })
    if (existingUser) { throw new AppError('Email already in use', 409, 'EMAIL_EXISTS') }

    const memberUser = await User.create({userName, email, phone: phone || null, role: 'Member', verified: true, isLoginEnabled: false, createdBy: parent.id }, { transaction: atomic })

    await atomic.commit()
    return res.status(201).json({ message: 'Member created successfully', user: { id: memberUser.id, userName: memberUser.userName, email: memberUser.email, phone: memberUser.phone, role: memberUser.role }})
  } 
  catch (error) {
    await atomic.rollback()
    throw error
  }
})
