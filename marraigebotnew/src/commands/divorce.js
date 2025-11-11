const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database/database');
const { reportError } = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('divorce')
        .setDescription('Divorce your current spouse'),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: false });

            const userData = await db.getUserData(interaction.user.id);
            
            if (!userData.married) {
                return await interaction.editReply('You are not married!');
            }

            const spouse = await interaction.client.users.fetch(userData.married);
            
            // Get all child relationships to enforce custody rules
            const userRelations = await db.getRelations(interaction.user.id);
            const spouseRelations = await db.getRelations(userData.married);
            
            // For each child relationship, remove the non-original parent
            for (const rel of userRelations) {
                if (rel.relationType === 'child' && rel.userId === interaction.user.id) {
                    const childId = rel.relatedUserId;
                    const originalParent = rel.originalParent;
                    
                    // If this user is not the original parent, remove the relationship
                    if (originalParent && originalParent !== interaction.user.id) {
                        // Remove this user's parent and child relationships with the child
                        await db.db.run('DELETE FROM family_relations WHERE (userId = ? AND relatedUserId = ?) OR (userId = ? AND relatedUserId = ?)',
                            [interaction.user.id, childId, childId, interaction.user.id]);
                    }
                }
            }
            
            for (const rel of spouseRelations) {
                if (rel.relationType === 'child' && rel.userId === userData.married) {
                    const childId = rel.relatedUserId;
                    const originalParent = rel.originalParent;
                    
                    // If spouse is not the original parent, remove the relationship
                    if (originalParent && originalParent !== userData.married) {
                        // Remove spouse's parent and child relationships with the child
                        await db.db.run('DELETE FROM family_relations WHERE (userId = ? AND relatedUserId = ?) OR (userId = ? AND relatedUserId = ?)',
                            [userData.married, childId, childId, userData.married]);
                    }
                }
            }
            
            await db.divorce(interaction.user.id, userData.married);
            
            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setDescription(`💔 ${interaction.user} has divorced ${spouse}. Children remain with their original parents.`);
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in divorce command:', error);
            await reportError(error, {
                commandName: 'divorce',
                userId: interaction.user.id,
                guildId: interaction.guildId
            });

            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while processing the divorce.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while processing the divorce.',
                    ephemeral: true
                });
            }
        }
    }
};