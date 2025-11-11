const db = require('../utils/database/database');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'runaway',
    async execute(message, args) {
        const userData = await db.getUserData(message.author.id);
        if (!userData.adoptedBy) {
            const embed = new EmbedBuilder()
                .setColor(0xffa500)
                .setDescription('You are not adopted!');
            return message.reply({ embeds: [embed] });
        }
        await db.disown(message.author.id);
        const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setDescription('You have run away from your adopted family!');
        message.reply({ embeds: [embed] });
    }
};