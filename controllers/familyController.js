require('dotenv').config()
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/AppError')
const { dbConnection, Family, FamilyMember } = require('../models')


exports.createFamily = catchAsync(async (req, res, next) => {
  const transaction = await dbConnection.transaction()
  try {
    const { familyName } = req.body
    const userId = req.user.id

    if (!req.user.verified) {
      throw new AppError('Please verify your account', 403, 'ACCOUNT_NOT_VERIFIED')
    }

    if (req.user.role !== 'Parent') { 
        throw new AppError('Only parents can create families', 403,'PARENT_ROLE_REQUIRED')
    }

    if (!familyName) {
    //   await transaction.rollback()
      throw new AppError('Family name is required', 400,'FAMILY_NAME_REQUIRED')
    }

    const existing = await Family.findOne({ where: { createdBy: userId }, transaction })
    if (existing) {
      await transaction.rollback()
      throw new AppError('You already created a family', 400,'FAMILY_ALREADY_EXISTS')
    }

    const family = await Family.create({ familyName, createdBy: userId }, { transaction })
    await FamilyMember.create(
      { userId, familyId: family.id, relationship: 'Parent', status: 'Active' },
      { transaction }
    )

    await transaction.commit()
    res.status(201).json({ success: true, message: 'Family created successfully.', family })
  } catch (error) {
    await transaction.rollback()
    throw error
  }
})

exports.addMemberToFamily = catchAsync(async (req, res, next) => {
  const transaction = await dbConnection.transaction()
  try {
    const { familyId, userId, relationship } = req.body
    const parentId = req.user.id

    if (!req.user.verified) {
        throw new AppError('Please verify your account', 400,'ACCOUNT_NOT_VERIFIED')
    }

    if (req.user.role !== 'Parent') { 
        throw new AppError('Only parents can add family members', 403,'PARENT_ROLE_REQUIRED')
    }

    const family = await Family.findByPk(familyId, { transaction })
    if (!family) {
    //   await transaction.rollback()
      throw new AppError('Family not found', 403,'FAMILY_NOT_FOUND')
    }

    if (family.createdBy !== parentId) {
      await transaction.rollback()
      throw new AppError('You are not allowed to modify this family', 403,'NOT_FAMILY_OWNER')
    }

    const memberExists = await FamilyMember.findOne({
      where: { userId, familyId },
      transaction
    })

    if (memberExists) {
    //   await transaction.rollback()
      throw new AppError('User is already a family member', 400,'FAMILY_MEMBER_EXISTS')
    }

    await FamilyMember.create({ userId, familyId, relationship, status: 'Not_Paired' }, { transaction })
    await transaction.commit()

    res.status(201).json({ message: 'Member added successfully.' })
  } catch (error) {
    await transaction.rollback()
    throw error
  }
})

exports.viewFamilyMembers = async (req, res, next) => {
  try {
    const { familyId } = req.params

    if (!req.user.verified) {
            return res.status(403).json({
                message: "Please verify your account before updating your profile"
            });
    }

    const family = await Family.findByPk(familyId, {
      include: [
        {
          model: User,
          as: 'members',
          attributes: ['id', 'email', 'firstName', 'lastName'],
          through: { attributes: ['relationship'] }
        }
      ]
    })

    if (!family) {
      return res.status(404).json({ message: 'Family not found.' })
    }

    res.status(200).json({ family })
  } catch (error) {
    console.error(error)
    next(error)
  }
}