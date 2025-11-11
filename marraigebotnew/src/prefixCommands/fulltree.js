const db = require('../utils/database/database');
const FamilyTreeGenerator = require('../utils/FamilyTreeGenerator');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'fulltree',
    async execute(message, args) {
        const relations = await db.getRelations(message.author.id);
        if (relations.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0x34495e)
                .setDescription('No family relationships found.');
            return message.reply({ embeds: [embed] });
        }
        // Optionally generate a tree image
        // const treeBuffer = await FamilyTreeGenerator.generateTree(message.client, message.author.id, relations);
        // message.reply({ files: [{ attachment: treeBuffer, name: 'fulltree.png' }] });
        const relMentions = relations.map(r => `<@${r.relatedUserId}> (${r.relationType})`).join(', ');
        const embed = new EmbedBuilder()
            .setColor(0x34495e)
            .setDescription(`Your full family tree: ${relMentions}`);
        message.reply({ embeds: [embed] });
    }
};