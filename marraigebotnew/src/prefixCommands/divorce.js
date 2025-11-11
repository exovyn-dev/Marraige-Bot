const db = require('../utils/database/database');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'divorce',
    async execute(message, args) {
        const userData = await db.getUserData(message.author.id);
        
        if (!userData.married) {
            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setDescription('You are not married!');
            return message.reply({ embeds: [embed] });
        }

        const spouse = await message.client.users.fetch(userData.married);
        await db.divorce(message.author.id, userData.married);
        
        message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xff0000)
                    .setDescription(`💔 ${message.author} has divorced ${spouse}...`)
            ]
        });
    }
};