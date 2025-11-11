const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { reportError } = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    async execute(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setDescription(`🏓 Pong! Latency is ${Date.now() - interaction.createdTimestamp}ms. API Latency is ${Math.round(interaction.client.ws.ping)}ms.`);
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in ping command:', error);
            await reportError(error, {
                commandName: 'ping',
                userId: interaction.user.id,
                guildId: interaction.guildId
            });

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'An error occurred while processing ping.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while processing ping.',
                    ephemeral: true
                });
            }
        }
    },
};