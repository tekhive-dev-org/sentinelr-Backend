const { Op } = require("sequelize");

const {
  Family,
  FamilyMember,
} = require("../models"); // Adjust the path to your models

const getAccessibleUserIds = async (user) => {
  const loggedInUserId = user.id;
  const loggedInUserRole = user.role;

if (loggedInUserRole !== "Parent") {
    return [loggedInUserId];
}

const families = await Family.findAll({
    where: {
      createdBy: loggedInUserId,
    },
    attributes: ["id"],
  });

  if (!families.length) {
    return [loggedInUserId];
  }

  const familyIds = families.map((family) => family.id);

  const members = await FamilyMember.findAll({
    where: {
      familyId: {
        [Op.in]: familyIds,
      },
    },
    attributes: ["userId"],
  });

  return [
    ...new Set([
      loggedInUserId,
      ...members.map((member) => member.userId),
    ]),
  ];
};

module.exports = {
  getAccessibleUserIds,
};