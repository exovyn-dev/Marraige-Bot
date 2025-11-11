const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database/database');
const { reportError } = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gender')
        .setDescription('Set your gender for relation labeling')
        .addStringOption(option =>
            option.setName('gender')
                .setDescription('Choose your gender')
                .setRequired(true)
                .addChoices(
                    { name: 'Male', value: 'male' },
                    { name: 'Female', value: 'female' },
                    { name: 'Non-binary', value: 'nonbinary' },
                    { name: 'Other/Prefer not to say', value: 'other' }
                )
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const gender = interaction.options.getString('gender');
            await db.setGender(interaction.user.id, gender);
            
            const embed = new EmbedBuilder()
                .setColor(0x7289da)
                .setDescription(`Your gender has been set to **${gender}**. This will affect labels like Son/Daughter, Uncle/Aunt, etc.`);
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in gender command:', error);
            await reportError(error, {
                commandName: 'gender',
                userId: interaction.user.id,
                guildId: interaction.guildId
            });

            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'Failed to set your gender.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'Failed to set your gender.',
                    ephemeral: true
                });
            }
        }
    }
};