const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database/database');
const { reportError } = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nephews')
        .setDescription('View your nephews/nieces or another user\'s nephews/nieces')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose nephews/nieces to view')
                .setRequired(false)),
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: false });

            const target = interaction.options.getUser('user') || interaction.user;
            const nephewsNieces = await db.getNephewsNieces(target.id);
            
            if (nephewsNieces.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0x2980b9)
                    .setDescription(`${target} has no nephews/nieces recorded.`);
                return await interaction.editReply({ embeds: [embed] });
            }
            
            const mentions = nephewsNieces.map(id => `<@${id}>`).join(', ');
            const embed = new EmbedBuilder()
                .setColor(0x2980b9)
                .setDescription(`Nephews/Nieces of ${target}: ${mentions}`);
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in nephews command:', error);
            await reportError(error, {
                commandName: 'nephews',
                userId: interaction.user.id,
                guildId: interaction.guildId
            });

            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while fetching nephews/nieces.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while fetching nephews/nieces.',
                    ephemeral: true
                });
            }
        }
    }
};