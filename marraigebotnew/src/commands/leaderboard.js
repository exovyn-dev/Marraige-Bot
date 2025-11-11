const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database/database');
const { reportError } = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Show family stats leaderboard'),
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: false });

            // Example: Most marriages, largest families
            // You would need to implement these queries in your database logic
            const stats = await db.getLeaderboardStats();
            const embed = new EmbedBuilder()
                .setColor(0x00bfff)
                .setTitle('📊 Family Leaderboard')
                .setDescription(stats || 'No stats available yet.');
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in leaderboard command:', error);
            await reportError(error, {
                commandName: 'leaderboard',
                userId: interaction.user.id,
                guildId: interaction.guildId
            });

            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while fetching leaderboard stats.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while fetching leaderboard stats.',
                    ephemeral: true
                });
            }
        }
    }
};