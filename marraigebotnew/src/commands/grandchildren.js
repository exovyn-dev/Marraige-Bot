const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database/database');
const { reportError } = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('grandchildren')
        .setDescription('View your grandchildren or another user\'s grandchildren')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose grandchildren to view')
                .setRequired(false)),
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: false });

            const target = interaction.options.getUser('user') || interaction.user;
            const grandchildren = await db.getGrandchildren(target.id);
            
            if (grandchildren.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0xf39c12)
                    .setDescription(`${target} has no grandchildren recorded.`);
                return await interaction.editReply({ embeds: [embed] });
            }
            
            const mentions = grandchildren.map(id => `<@${id}>`).join(', ');
            const embed = new EmbedBuilder()
                .setColor(0xf39c12)
                .setDescription(`Grandchildren of ${target}: ${mentions}`);
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in grandchildren command:', error);
            await reportError(error, {
                commandName: 'grandchildren',
                userId: interaction.user.id,
                guildId: interaction.guildId
            });

            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while fetching grandchildren.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while fetching grandchildren.',
                    ephemeral: true
                });
            }
        }
    }
};