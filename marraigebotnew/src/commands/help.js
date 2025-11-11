const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('List all available commands and their descriptions'),
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const embed = new EmbedBuilder()
                .setColor(0x7289da)
                .setTitle('💍 Marriage Bot Help')
                .setDescription('Here are all available commands:')
                .addFields(
                    {
                        name: '💕 Relationship Commands',
                        value: '`/marry <user>` - Propose marriage to another user\n' +
                               '`/divorce` - Divorce your spouse\n' +
                               '`/adopt <user>` - Adopt another user\n' +
                               '`/disown <user>` - Disown a child\n' +
                               '`/runaway` - Run away from your adoptive family\n' +
                               '`/kiss <user>` - Kiss your spouse (24h cooldown)',
                        inline: false
                    },
                    {
                        name: '👶 Breeding',
                        value: '`/breed <baby_name>` - Create a true blood child with your spouse (9-day cooldown)\n' +
                               '`/gender <gender>` - Set your gender (male/female/nonbinary/other)',
                        inline: false
                    },
                    {
                        name: '👨‍👩‍👧 Family Lookup',
                        value: '`/parents [user]` - View parents\n' +
                               '`/siblings [user]` - View siblings\n' +
                               '`/children [user]` - View children\n' +
                               '`/grandparents [user]` - View grandparents\n' +
                               '`/grandchildren [user]` - View grandchildren\n' +
                               '`/uncles [user]` - View uncles/aunts\n' +
                               '`/nephews [user]` - View nephews/nieces',
                        inline: false
                    },
                    {
                        name: '🌳 Family Trees',
                        value: '`/tree [user]` - View family tree (blood relatives only)\n' +
                               '`/fulltree [user]` - View full family tree (all relations)\n' +
                               '`/family [user]` - View detailed family information',
                        inline: false
                    },
                    {
                        name: '📊 Stats',
                        value: '`/leaderboard` - Show family stats leaderboard\n' +
                               '`/credits` - View bot credits',
                        inline: false
                    }
                )
                .setFooter({ text: 'Use /help to see this message again' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in help command:', error);
            if (interaction.deferred) {
                await interaction.editReply({ content: 'An error occurred while fetching help information.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'An error occurred while fetching help information.', ephemeral: true });
            }
        }
    }
};