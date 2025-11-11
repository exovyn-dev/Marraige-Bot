const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database/database');
const { reportError } = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('parents')
        .setDescription('View your parents or another user\'s parents')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose parents to view')
                .setRequired(false)),
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: false });

            const target = interaction.options.getUser('user') || interaction.user;
            const relations = await db.getRelations(target.id);
            const parents = relations.filter(r => r.relationType === 'parent');
            
            if (parents.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setDescription(`${target} has no parents recorded.`);
                return await interaction.editReply({ embeds: [embed] });
            }
            
            const parentMentions = parents.map(p => `<@${p.relatedUserId}>`).join(', ');
            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setDescription(`Parents of ${target}: ${parentMentions}`);
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in parents command:', error);
            await reportError(error, {
                commandName: 'parents',
                userId: interaction.user.id,
                guildId: interaction.guildId
            });

            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while fetching parents.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while fetching parents.',
                    ephemeral: true
                });
            }
        }
    }
};