const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config/config.json');
const { reportError } = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('credits')
        .setDescription('Show bot developer credits'),
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const embed = new EmbedBuilder()
                .setColor(0x7289da)
                .setTitle('💍 Bot Credits')
                .setDescription(`**Developer:** ${config.credits.dev}\n\n**Features:** Marriage system, family trees, breeding mechanics, and more!`);
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in credits command:', error);
            await reportError(error, {
                commandName: 'credits',
                userId: interaction.user.id,
                guildId: interaction.guildId
            });

            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while fetching credits.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while fetching credits.',
                    ephemeral: true
                });
            }
        }
    }
};