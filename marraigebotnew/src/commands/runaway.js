const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database/database');
const { reportError } = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('runaway')
        .setDescription('Run away from your adopted family'),
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: false });

            const userData = await db.getUserData(interaction.user.id);
            if (!userData.adoptedBy) {
                const embed = new EmbedBuilder()
                    .setColor(0xffa500)
                    .setDescription('You are not adopted!');
                return await interaction.editReply({ embeds: [embed] });
            }
            
            await db.disown(interaction.user.id);
            const embed = new EmbedBuilder()
                .setColor(0xffa500)
                .setDescription('You have run away from your adopted family!');
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in runaway command:', error);
            await reportError(error, {
                commandName: 'runaway',
                userId: interaction.user.id,
                guildId: interaction.guildId
            });

            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while processing runaway.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while processing runaway.',
                    ephemeral: true
                });
            }
        }
    }
};