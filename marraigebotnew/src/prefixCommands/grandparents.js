const db = require('../utils/database/database');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'grandparents',
    async execute(message, args) {
        const grandparents = await db.getGrandparents(message.author.id);
        if (grandparents.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xf1c40f)
                .setDescription('You have no grandparents recorded.');
            return message.reply({ embeds: [embed] });
        }
        const mentions = grandparents.map(id => `<@${id}>`).join(', ');
        const embed = new EmbedBuilder()
            .setColor(0xf1c40f)
            .setDescription(`Your grandparents: ${mentions}`);
        message.reply({ embeds: [embed] });
    }
};