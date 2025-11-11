const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database/database');
const { reportError } = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('grandparents')
        .setDescription('View your grandparents or another user\'s grandparents')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose grandparents to view')
                .setRequired(false)),
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: false });

            const target = interaction.options.getUser('user') || interaction.user;
            const grandparents = await db.getGrandparents(target.id);
            
            if (grandparents.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0xf1c40f)
                    .setDescription(`${target} has no grandparents recorded.`);
                return await interaction.editReply({ embeds: [embed] });
            }
            
            const mentions = grandparents.map(id => `<@${id}>`).join(', ');
            const embed = new EmbedBuilder()
                .setColor(0xf1c40f)
                .setDescription(`Grandparents of ${target}: ${mentions}`);
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in grandparents command:', error);
            await reportError(error, {
                commandName: 'grandparents',
                userId: interaction.user.id,
                guildId: interaction.guildId
            });

            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while fetching grandparents.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while fetching grandparents.',
                    ephemeral: true
                });
            }
        }
    }
};