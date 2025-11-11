const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database/database');
const { reportError } = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uncles')
        .setDescription('View your uncles/aunts or another user\'s uncles/aunts')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose uncles/aunts to view')
                .setRequired(false)),
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: false });

            const target = interaction.options.getUser('user') || interaction.user;
            const unclesAunts = await db.getUnclesAunts(target.id);
            
            if (unclesAunts.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0x8e44ad)
                    .setDescription(`${target} has no uncles/aunts recorded.`);
                return await interaction.editReply({ embeds: [embed] });
            }
            
            const mentions = unclesAunts.map(id => `<@${id}>`).join(', ');
            const embed = new EmbedBuilder()
                .setColor(0x8e44ad)
                .setDescription(`Uncles/Aunts of ${target}: ${mentions}`);
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in uncles command:', error);
            await reportError(error, {
                commandName: 'uncles',
                userId: interaction.user.id,
                guildId: interaction.guildId
            });

            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while fetching uncles/aunts.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while fetching uncles/aunts.',
                    ephemeral: true
                });
            }
        }
    }
};