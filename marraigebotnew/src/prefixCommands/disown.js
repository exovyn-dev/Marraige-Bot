const db = require('../utils/database/database');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'disown',
    async execute(message, args) {
        if (args.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xffa500)
                .setDescription('You need to mention a child to disown!');
            return message.reply({ embeds: [embed] });
        }
        const target = message.mentions.users.first();
        if (!target) {
            const embed = new EmbedBuilder()
                .setColor(0xffa500)
                .setDescription('You need to mention a valid user!');
            return message.reply({ embeds: [embed] });
        }
        // Check if target is a child of the author
        const relations = await db.getRelations(message.author.id);
        const isChild = relations.some(r => r.relatedUserId === target.id && r.relationType === 'child');
        if (!isChild) {
            const embed = new EmbedBuilder()
                .setColor(0xffa500)
                .setDescription('That user is not your child!');
            return message.reply({ embeds: [embed] });
        }
        await db.disown(target.id);
        const embed = new EmbedBuilder()
            .setColor(0xffa500)
            .setDescription(`You have disowned <@${target.id}>.`);
        message.reply({ embeds: [embed] });
    }
};