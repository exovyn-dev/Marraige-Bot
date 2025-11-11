const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database/database');
const FamilyTreeGenerator = require('../utils/FamilyTreeGenerator');
const { reportError } = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tree')
        .setDescription('View your family tree of blood relatives')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose tree to view')
                .setRequired(false)),
    async execute(interaction) {
        try {
            // Defer early to avoid interaction token expiration for slower operations (fetching users)
            if (!interaction.deferred && !interaction.replied) await interaction.deferReply();
            
            const target = interaction.options.getUser('user') || interaction.user;
            const relations = await db.getRelations(target.id);

            // Normalize relations from the perspective of the target and filter for blood relations
            const inverse = (type) => {
                if (type === 'parent') return 'child';
                if (type === 'child') return 'parent';
                return type;
            };

            const relMap = new Map(); // otherId -> relationType
            for (const r of relations) {
                // Determine the other user in this row
                const otherId = r.userId === target.id ? r.relatedUserId : r.userId;
                let relType = r.userId === target.id ? r.relationType : inverse(r.relationType);

                // Only keep blood relations here
                if (!['parent', 'child', 'sibling'].includes(relType)) continue;

                // Deduplicate: prefer parent/child over sibling if multiple types exist
                const existing = relMap.get(otherId);
                if (existing) {
                    if (existing === 'sibling' && (relType === 'parent' || relType === 'child')) {
                        relMap.set(otherId, relType);
                    }
                } else {
                    relMap.set(otherId, relType);
                }
            }

            if (relMap.size === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0x1abc9c)
                    .setDescription(`${target} has no blood relatives recorded.`);
                return await interaction.editReply({ embeds: [embed] });
            }

            // Group by relation type for readability
            const grouped = { parent: [], child: [], sibling: [] };
            for (const [otherId, type] of relMap.entries()) grouped[type].push(otherId);

            // Try to resolve user tags where possible
            const formatUser = async (id) => {
                const cached = interaction.client.users.cache.get(id);
                if (cached) return `${cached.tag} (<@${id}>)`;
                try {
                    const fetched = await interaction.client.users.fetch(id);
                    return `${fetched.tag} (<@${id}>)`;
                } catch {
                    return `<@${id}>`;
                }
            };

            const parts = [];
            for (const type of ['parent', 'child', 'sibling']) {
                if (grouped[type].length === 0) continue;
                const users = await Promise.all(grouped[type].map(id => formatUser(id)));
                parts.push(`**${type[0].toUpperCase() + type.slice(1)}s:** ${users.join(', ')}`);
            }

            const embed = new EmbedBuilder()
                .setColor(0x1abc9c)
                .setTitle(`Blood relatives of ${target.tag || target.username}`)
                .setDescription(parts.join('\n'));

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in tree command:', error);
            await reportError(error, {
                commandName: 'tree',
                userId: interaction.user.id,
                guildId: interaction.guildId
            });

            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while generating your family tree.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while generating your family tree.',
                    ephemeral: true
                });
            }
        }
    }
};