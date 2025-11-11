const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database/database');
const FamilyTreeGenerator = require('../utils/FamilyTreeGenerator');
const { reportError } = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fulltree')
        .setDescription('View your full family tree including spouses and their families')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose full tree to view')
                .setRequired(false)),
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: false });

            const target = interaction.options.getUser('user') || interaction.user;
            const relations = await db.getRelations(target.id);
            
            if (relations.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0x34495e)
                    .setDescription(`${target} has no family relationships recorded.`);
                return await interaction.editReply({ embeds: [embed] });
            }
            
            const relMentions = relations.map(r => `<@${r.relatedUserId}> (${r.relationType})`).join(', ');
            const embed = new EmbedBuilder()
                .setColor(0x34495e)
                .setDescription(`Full family tree of ${target}: ${relMentions}`);
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in fulltree command:', error);
            await reportError(error, {
                commandName: 'fulltree',
                userId: interaction.user.id,
                guildId: interaction.guildId
            });

            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while generating your full family tree.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while generating your full family tree.',
                    ephemeral: true
                });
            }
        }
    }
};