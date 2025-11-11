const db = require('../utils/database/database');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'parents',
    async execute(message, args) {
        const relations = await db.getRelations(message.author.id);
        const parents = relations.filter(r => r.relationType === 'parent');
        if (parents.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setDescription('You have no parents recorded.');
            return message.reply({ embeds: [embed] });
        }
        const parentMentions = parents.map(p => `<@${p.relatedUserId}>`).join(', ');
        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setDescription(`Your parents: ${parentMentions}`);
        message.reply({ embeds: [embed] });
    }
};