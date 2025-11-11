const db = require('../utils/database/database');
const RelationshipValidator = require('../utils/RelationshipValidator');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'marry',
    async execute(message, args) {
        if (args.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xff69b4)
                .setDescription('You need to mention someone to marry!');
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
                .setDescription('You cannot marry yourself!');
            return message.reply({ embeds: [embed] });
        }

        const canMarry = await RelationshipValidator.canMarry(db, message.author.id, target.id);
        if (!canMarry.allowed) {
            const embed = new EmbedBuilder()
                .setColor(0xff69b4)
                .setDescription(canMarry.reason);
            return message.reply({ embeds: [embed] });
        }

        const filter = response => response.author.id === target.id;
        message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xff69b4)
                    .setDescription(`${target}, ${message.author} has proposed marriage to you! Reply with 'yes' or 'no' within 30 seconds.`)
            ]
        });

        try {
            const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
            const response = collected.first().content.toLowerCase();

            if (response === 'yes') {
                await db.marry(message.author.id, target.id);
                await db.addRelation(message.author.id, target.id, 'spouse');
                message.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x00ff99)
                            .setDescription(`💝 Congratulations! ${message.author} and ${target} are now married!`)
                    ]
                });
            } else {
                message.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xff0000)
                            .setDescription(`💔 ${target} has declined the marriage proposal.`)
                    ]
                });
            }
        } catch (error) {
            message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xff0000)
                        .setDescription('No response received, marriage proposal cancelled.')
                ]
            });
        }
    }
};