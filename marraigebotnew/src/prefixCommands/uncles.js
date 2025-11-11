const db = require('../utils/database/database');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'uncles',
    async execute(message, args) {
        const unclesAunts = await db.getUnclesAunts(message.author.id);
        if (unclesAunts.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0x8e44ad)
                .setDescription('You have no uncles or aunts recorded.');
            return message.reply({ embeds: [embed] });
        }
        const mentions = unclesAunts.map(id => `<@${id}>`).join(', ');
        const embed = new EmbedBuilder()
            .setColor(0x8e44ad)
            .setDescription(`Your uncles/aunts: ${mentions}`);
        message.reply({ embeds: [embed] });
    }
};