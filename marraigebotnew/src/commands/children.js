const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database/database');
const { reportError } = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('children')
        .setDescription('View your children or another user\'s children')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose children to view')
                .setRequired(false)),
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: false });

            const target = interaction.options.getUser('user') || interaction.user;
            const relations = await db.getRelations(target.id);
            const children = relations.filter(r => r.relationType === 'child');
            
            if (children.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setDescription(`${target} has no children recorded.`);
                return await interaction.editReply({ embeds: [embed] });
            }
            
            const childMentions = children.map(c => `<@${c.relatedUserId}>`).join(', ');
            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setDescription(`Children of ${target}: ${childMentions}`);
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in children command:', error);
            await reportError(error, {
                commandName: 'children',
                userId: interaction.user.id,
                guildId: interaction.guildId
            });

            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while fetching children.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while fetching children.',
                    ephemeral: true
                });
            }
        }
    }
};