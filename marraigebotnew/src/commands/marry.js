const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../utils/database/database');
const RelationshipValidator = require('../utils/RelationshipValidator');
const { reportError } = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('marry')
        .setDescription('Propose marriage to another user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to marry')
                .setRequired(true)),

    async execute(interaction) {
        try {
            const target = interaction.options.getUser('user');
            
            if (target.id === interaction.user.id) {
                const embed = new EmbedBuilder()
                    .setColor(0xff69b4)
                    .setDescription('You cannot marry yourself!');
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const canMarry = await RelationshipValidator.canMarry(db, interaction.user.id, target.id);
            if (!canMarry.allowed) {
                const embed = new EmbedBuilder()
                    .setColor(0xff69b4)
                    .setDescription(canMarry.reason);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor(0xff69b4)
                .setDescription(`${target}, ${interaction.user} has proposed marriage to you!`);
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('marry_accept')
                        .setLabel('Accept')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('marry_decline')
                        .setLabel('Decline')
                        .setStyle(ButtonStyle.Danger)
                );

            await interaction.reply({ embeds: [embed], components: [row] });

            const filter = i => i.user.id === target.id && ['marry_accept', 'marry_decline'].includes(i.customId);
            const response = await interaction.channel.awaitMessageComponent({ filter, time: 30000 });

            if (response.customId === 'marry_accept') {
                await db.marry(interaction.user.id, target.id);
                await db.addRelation(interaction.user.id, target.id, 'spouse');
                
                // Merge children: get all children from both users and link them all to both users
                const user1Children = await db.getRelations(interaction.user.id);
                const user2Children = await db.getRelations(target.id);
                
                const children = new Map(); // childId -> originalParent
                for (const rel of user1Children) {
                    if (rel.relationType === 'child' && rel.userId === interaction.user.id) {
                        children.set(rel.relatedUserId, interaction.user.id);
                    }
                }
                for (const rel of user2Children) {
                    if (rel.relationType === 'child' && rel.userId === target.id && !children.has(rel.relatedUserId)) {
                        children.set(rel.relatedUserId, target.id);
                    }
                }
                
                // Link all children to both parents, tracking original parent
                for (const [childId, originalParent] of children) {
                    await db.addRelation(interaction.user.id, childId, 'child', originalParent);
                    await db.addRelation(target.id, childId, 'child', originalParent);
                    await db.addRelation(childId, interaction.user.id, 'parent');
                    await db.addRelation(childId, target.id, 'parent');
                }
                
                await response.update({
                    embeds: [new EmbedBuilder().setColor(0x00ff99).setDescription(`💝 Congratulations! ${interaction.user} and ${target} are now married!`)],
                    components: []
                });
            } else {
                await response.update({
                    embeds: [new EmbedBuilder().setColor(0xff0000).setDescription(`💔 ${target} has declined the marriage proposal.`)],
                    components: []
                });
            }
        } catch (error) {
            if (error.code === 'InteractionCollectorError') {
                // Timeout occurred
                return;
            }

            console.error('Error in marry command:', error);
            await reportError(error, {
                commandName: 'marry',
                userId: interaction.user.id,
                guildId: interaction.guildId
            });

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'An error occurred while processing the marriage proposal.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while processing the marriage proposal.',
                    ephemeral: true
                });
            }
        }
    }
};