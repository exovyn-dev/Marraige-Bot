const db = require('../utils/database/database');
const RelationshipValidator = require('../utils/RelationshipValidator');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'kiss',
    async execute(message, args) {
        if (args.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xff69b4)
                .setDescription('You need to mention someone to kiss!');
            return message.reply({ embeds: [embed] });
        }

        const target = message.mentions.users.first();
        if (!target) {
            const embed = new EmbedBuilder()
                .setColor(0xff69b4)
                .setDescription('You need to mention a valid user!');
            return message.reply({ embeds: [embed] });
        }

        if (target.id === message.author.id) {
            const embed = new EmbedBuilder()
                .setColor(0xff69b4)
                .setDescription('You cannot kiss yourself!');
            return message.reply({ embeds: [embed] });
        }

        const canKiss = await RelationshipValidator.canKiss(db, message.author.id, target.id);
        if (!canKiss.allowed) {
            const embed = new EmbedBuilder()
                .setColor(0xff69b4)
                .setDescription(canKiss.reason);
            return message.reply({ embeds: [embed] });
        }

        // Update last kiss time
        await db.getUserData(message.author.id);
        message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xff69b4)
                    .setDescription(`💋 ${message.author} kissed ${target}! How romantic!`)
            ]
        });
    }
};