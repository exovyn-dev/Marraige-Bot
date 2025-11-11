const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database/database');
const { reportError } = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('breed')
        .setDescription('Create a true blood child with your spouse (9-day cooldown)')
        .addStringOption(option =>
            option.setName('baby_name')
                .setDescription('The name of your baby')
                .setRequired(true)),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: false });

            const babyName = interaction.options.getString('baby_name').substring(0, 32);
            
            // Check if user is married
            const userData = await db.getUserData(interaction.user.id);
            if (!userData || !userData.married) {
                const embed = new EmbedBuilder()
                    .setColor(0xff69b4)
                    .setDescription('You must be married to breed! Use `/marry` first.');
                return await interaction.editReply({ embeds: [embed] });
            }

            const spouseId = userData.married;

            // Check cooldown
            const canBreed = await db.canBreed(interaction.user.id, spouseId, 9);
            if (!canBreed) {
                const nextTime = await db.getNextBreedTime(interaction.user.id, spouseId, 9);
                const nextDate = new Date(nextTime);
                const embed = new EmbedBuilder()
                    .setColor(0xff69b4)
                    .setDescription(`You and your spouse can breed again on <t:${Math.floor(nextDate.getTime() / 1000)}:F>`);
                return await interaction.editReply({ embeds: [embed] });
            }

            // Generate a baby ID
            const babyId = `baby_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            
            // Create baby in DB
            await db.getUserData(babyId); // Initialize baby user
            
            // Link parents and track original parent (both parents for bred children)
            // For bred children, we mark the first parent (interaction.user.id) as originalParent
            // so they can't be separated on divorce
            await db.addRelation(interaction.user.id, babyId, 'child', interaction.user.id);
            await db.addRelation(spouseId, babyId, 'child', interaction.user.id);
            await db.addRelation(babyId, interaction.user.id, 'parent');
            await db.addRelation(babyId, spouseId, 'parent');

            // Record breed cooldown
            await db.recordBreed(interaction.user.id, spouseId);

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setDescription(`👶 Congratulations! You and <@${spouseId}> have created a baby: **${babyName}** (<@${babyId}>)!\n\nYou can breed again in 9 days.`);
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in breed command:', error);
            await reportError(error, {
                commandName: 'breed',
                userId: interaction.user.id,
                guildId: interaction.guildId
            });

            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while creating your baby.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while creating your baby.',
                    ephemeral: true
                });
            }
        }
    }
};