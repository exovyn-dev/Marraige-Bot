class RelationshipValidator {
    static async canMarry(db, user1Id, user2Id) {
        const relation = await db.areRelated(user1Id, user2Id);
        if (relation) {
            return {
                allowed: false,
                reason: `You cannot marry your ${relation.relationType}!`
            };
        }

        const user1Data = await db.getUserData(user1Id);
        const user2Data = await db.getUserData(user2Id);

        if (user1Data.married) {
            return {
                allowed: false,
                reason: "You are already married!"
            };
        }

        if (user2Data.married) {
            return {
                allowed: false,
                reason: "That person is already married!"
            };
        }

        return { allowed: true };
    }

    static async canAdopt(db, parentId, childId) {
        const relation = await db.areRelated(parentId, childId);
        if (relation) {
            return {
                allowed: false,
                reason: `You cannot adopt your ${relation.relationType}!`
            };
        }

        const childData = await db.getUserData(childId);
        if (childData.adoptedBy) {
            return {
                allowed: false,
                reason: "This person is already adopted!"
            };
        }

        return { allowed: true };
    }

    static async canKiss(db, user1Id, user2Id) {
        const userData = await db.getUserData(user1Id);
        if (userData.married !== user2Id) {
            return {
                allowed: false,
                reason: "You can only kiss your spouse!"
            };
        }

        const lastKiss = userData.lastKiss || 0;
        const now = Date.now();
        const cooldown = 3600000; // 1 hour cooldown

        if (now - lastKiss < cooldown) {
            return {
                allowed: false,
                reason: `You can kiss again in ${Math.ceil((cooldown - (now - lastKiss)) / 60000)} minutes!`
            };
        }

        return { allowed: true };
    }
}

module.exports = RelationshipValidator;