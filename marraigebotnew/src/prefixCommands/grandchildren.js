const db = require('../utils/database/database');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'grandchildren',
    async execute(message, args) {
        const grandchildren = await db.getGrandchildren(message.author.id);
        if (grandchildren.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xf39c12)
                .setDescription('You have no grandchildren recorded.');
            return message.reply({ embeds: [embed] });
        }
        const mentions = grandchildren.map(id => `<@${id}>`).join(', ');
        const embed = new EmbedBuilder()
            .setColor(0xf39c12)
            .setDescription(`Your grandchildren: ${mentions}`);
        message.reply({ embeds: [embed] });
    }
};