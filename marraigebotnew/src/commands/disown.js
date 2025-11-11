const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database/database');
const { reportError } = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('disown')
        .setDescription('Disown a child')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The child to disown')
                .setRequired(true)),
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: false });

            const target = interaction.options.getUser('user');
            const relations = await db.getRelations(interaction.user.id);
            const isChild = relations.some(r => r.relatedUserId === target.id && r.relationType === 'child');
            
            if (!isChild) {
                const embed = new EmbedBuilder()
                    .setColor(0xffa500)
                    .setDescription('That user is not your child!');
                return await interaction.editReply({ embeds: [embed] });
            }
            
            await db.disown(target.id);
            const embed = new EmbedBuilder()
                .setColor(0xffa500)
                .setDescription(`You have disowned <@${target.id}>.`);
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in disown command:', error);
            await reportError(error, {
                commandName: 'disown',
                userId: interaction.user.id,
                guildId: interaction.guildId
            });

            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while processing the disown.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while processing the disown.',
                    ephemeral: true
                });
            }
        }
    }
};