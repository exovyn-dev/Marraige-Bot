const db = require('../utils/database/database');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'siblings',
    async execute(message, args) {
        const relations = await db.getRelations(message.author.id);
        const siblings = relations.filter(r => r.relationType === 'sibling');
        if (siblings.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0x9b59b6)
                .setDescription('You have no siblings recorded.');
            return message.reply({ embeds: [embed] });
        }
        const siblingMentions = siblings.map(s => `<@${s.relatedUserId}>`).join(', ');
        const embed = new EmbedBuilder()
            .setColor(0x9b59b6)
            .setDescription(`Your siblings: ${siblingMentions}`);
        message.reply({ embeds: [embed] });
    }
};