const database = require('./database/database.js');
const fs = require('fs');
const path = require('path');

async function migrateLegacyData() {
    try {
        // Database is already initialized in database.js

        // Read legacy data
        const legacyData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'relationships.json'), 'utf8'));

        // Migrate relationships
        for (const [userId, userData] of Object.entries(legacyData)) {
            // Skip null/empty data
            if (!userData || !userId) continue;

            // Create or update user
            await database.getUserData(userId);

            // Add current relationship (marriage)
            if (userData.partner && userData.status === 'married') {
                await database.marry(userId, userData.partner);
            }

            // Add children relationships
            if (userData.children && Array.isArray(userData.children)) {
                for (const childId of userData.children) {
                    await database.adopt(userId, childId);
                    await database.addRelation(userId, childId, 'child');
                    await database.addRelation(childId, userId, 'parent');
                }
            }

            // Add historical relationships as family relations
            if (userData.history && Array.isArray(userData.history)) {
                for (const historyEntry of userData.history) {
                    const partnerId = historyEntry.partner || historyEntry.partnerId;
                    if (!partnerId) continue;

                    if (historyEntry.status === 'married') {
                        await database.addRelation(userId, partnerId, 'spouse');
                        await database.addRelation(partnerId, userId, 'spouse');
                    }
                }
            }
        }

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Error during migration:', error);
    }
}

// Run migration
migrateLegacyData();