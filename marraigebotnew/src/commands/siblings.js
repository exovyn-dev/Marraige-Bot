const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database/database');
const { reportError } = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('siblings')
        .setDescription('View your siblings or another user\'s siblings')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose siblings to view')
                .setRequired(false)),
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: false });

            const target = interaction.options.getUser('user') || interaction.user;
            const relations = await db.getRelations(target.id);
            const siblings = relations.filter(r => r.relationType === 'sibling');
            
            if (siblings.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0x9b59b6)
                    .setDescription(`${target} has no siblings recorded.`);
                return await interaction.editReply({ embeds: [embed] });
            }
            
            const siblingMentions = siblings.map(s => `<@${s.relatedUserId}>`).join(', ');
            const embed = new EmbedBuilder()
                .setColor(0x9b59b6)
                .setDescription(`Siblings of ${target}: ${siblingMentions}`);
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in siblings command:', error);
            await reportError(error, {
                commandName: 'siblings',
                userId: interaction.user.id,
                guildId: interaction.guildId
            });

            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while fetching siblings.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while fetching siblings.',
                    ephemeral: true
                });
            }
        }
    }
};