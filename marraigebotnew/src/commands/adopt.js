const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../utils/database/database');
const RelationshipValidator = require('../utils/RelationshipValidator');
const { reportError } = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adopt')
        .setDescription('Adopt another user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to adopt')
                .setRequired(true)),

    async execute(interaction) {
        try {
            const target = interaction.options.getUser('user');
            if (target.id === interaction.user.id) {
                const embed = new EmbedBuilder()
                    .setColor(0xffa500)
                    .setDescription('You cannot adopt yourself!');
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            const canAdopt = await RelationshipValidator.canAdopt(db, interaction.user.id, target.id);
            if (!canAdopt.allowed) {
                const embed = new EmbedBuilder()
                    .setColor(0xffa500)
                    .setDescription(canAdopt.reason);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            const embed = new EmbedBuilder()
                .setColor(0xffa500)
                .setDescription(`${target}, ${interaction.user} wants to adopt you!`);
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('adopt_accept')
                        .setLabel('Accept')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('adopt_decline')
                        .setLabel('Decline')
                        .setStyle(ButtonStyle.Danger)
                );
            await interaction.reply({ embeds: [embed], components: [row] });
            const filter = i => i.user.id === target.id && ['adopt_accept', 'adopt_decline'].includes(i.customId);
            const response = await interaction.channel.awaitMessageComponent({ filter, time: 30000 });
            
            if (response.customId === 'adopt_accept') {
                await db.adopt(interaction.user.id, target.id);
                // Track adopter as the original parent, so children can't be separated on divorce
                await db.addRelation(interaction.user.id, target.id, 'parent', interaction.user.id);
                await db.addRelation(target.id, interaction.user.id, 'child', interaction.user.id);
                await response.update({
                    embeds: [new EmbedBuilder().setColor(0x2ecc71).setDescription(`👨‍👩‍👧 ${interaction.user} has adopted ${target}!`)],
                    components: []
                });
            } else {
                await response.update({
                    embeds: [new EmbedBuilder().setColor(0xff0000).setDescription(`❌ ${target} has declined the adoption request.`)],
                    components: []
                });
            }
        } catch (error) {
            if (error.code === 'InteractionCollectorError') {
                return;
            }

            console.error('Error in adopt command:', error);
            await reportError(error, {
                commandName: 'adopt',
                userId: interaction.user.id,
                guildId: interaction.guildId
            });

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'An error occurred while processing the adoption.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while processing the adoption.',
                    ephemeral: true
                });
            }
        }
    }
};