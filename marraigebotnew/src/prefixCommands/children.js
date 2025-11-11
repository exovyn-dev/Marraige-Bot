const db = require('../utils/database/database');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'children',
    async execute(message, args) {
        const relations = await db.getRelations(message.author.id);
        const children = relations.filter(r => r.relationType === 'child');
        if (children.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setDescription('You have no children recorded.');
            return message.reply({ embeds: [embed] });
        }
        const childMentions = children.map(c => `<@${c.relatedUserId}>`).join(', ');
        const embed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setDescription(`Your children: ${childMentions}`);
        message.reply({ embeds: [embed] });
    }
};