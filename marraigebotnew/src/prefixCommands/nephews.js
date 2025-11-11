const db = require('../utils/database/database');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'nephews',
    async execute(message, args) {
        const nephewsNieces = await db.getNephewsNieces(message.author.id);
        if (nephewsNieces.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0x2980b9)
                .setDescription('You have no nephews or nieces recorded.');
            return message.reply({ embeds: [embed] });
        }
        const mentions = nephewsNieces.map(id => `<@${id}>`).join(', ');
        const embed = new EmbedBuilder()
            .setColor(0x2980b9)
            .setDescription(`Your nephews/nieces: ${mentions}`);
        message.reply({ embeds: [embed] });
    }
};