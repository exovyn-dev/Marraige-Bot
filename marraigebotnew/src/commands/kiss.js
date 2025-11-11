const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database/database');
const RelationshipValidator = require('../utils/RelationshipValidator');
const { reportError } = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kiss')
        .setDescription('Kiss your spouse (24h cooldown)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to kiss')
                .setRequired(true)),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: false });

            const target = interaction.options.getUser('user');
            
            if (target.id === interaction.user.id) {
                const embed = new EmbedBuilder()
                    .setColor(0xff69b4)
                    .setDescription('You cannot kiss yourself!');
                return await interaction.editReply({ embeds: [embed] });
            }

            const canKiss = await RelationshipValidator.canKiss(db, interaction.user.id, target.id);
            if (!canKiss.allowed) {
                const embed = new EmbedBuilder()
                    .setColor(0xff69b4)
                    .setDescription(canKiss.reason);
                return await interaction.editReply({ embeds: [embed] });
            }

            // Update last kiss time
            await db.getUserData(interaction.user.id);
            
            const embed = new EmbedBuilder()
                .setColor(0xff69b4)
                .setDescription(`💋 ${interaction.user} kissed ${target}! How romantic!`);
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in kiss command:', error);
            await reportError(error, {
                commandName: 'kiss',
                userId: interaction.user.id,
                guildId: interaction.guildId
            });

            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while processing the kiss.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while processing the kiss.',
                    ephemeral: true
                });
            }
        }
    }
};