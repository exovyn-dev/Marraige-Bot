const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database/database');
const FamilyTreeGenerator = require('../utils/FamilyTreeGenerator');
const { reportError } = require('../utils/errorHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('family')
        .setDescription('View your family tree')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose family tree to view')
                .setRequired(false)),

    async execute(interaction) {
        try {
            // Defer early so we have more time for image generation and user fetches
            if (!interaction.deferred && !interaction.replied) await interaction.deferReply();
            
            const target = interaction.options.getUser('user') || interaction.user;
            const relations = await db.getRelations(target.id);

            if (relations.length === 0) {
                const msg = `${target} has no family relationships yet!`;
                return await interaction.editReply({ content: msg, ephemeral: true });
            }

            // Present a readable summary of family members and types, and also attach the generated image
            const inverse = (type) => {
                if (type === 'parent') return 'child';
                if (type === 'child') return 'parent';
                return type;
            };

            const relMap = new Map();
            for (const r of relations) {
                const otherId = r.userId === target.id ? r.relatedUserId : r.userId;
                const relType = r.userId === target.id ? r.relationType : inverse(r.relationType);
                // prefer parent/child over generic relations
                const existing = relMap.get(otherId);
                if (existing && existing === 'sibling' && (relType === 'parent' || relType === 'child')) {
                    relMap.set(otherId, relType);
                } else if (!existing) {
                    relMap.set(otherId, relType);
                }
            }

            const grouped = {};
            for (const [id, type] of relMap.entries()) {
                if (!grouped[type]) grouped[type] = [];
                grouped[type].push(id);
            }

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

            const lines = [];
            for (const [type, ids] of Object.entries(grouped)) {
                const users = await Promise.all(ids.map(id => formatUser(id)));
                lines.push(`**${type[0].toUpperCase() + type.slice(1)}s:** ${users.join(', ')}`);
            }

            const treeBuffer = await FamilyTreeGenerator.generateTree(interaction.client, target.id, relations);

            const payload = {
                embeds: [new EmbedBuilder()
                    .setTitle(`🌳 Family for ${target.tag || target.username}`)
                    .setDescription(lines.join('\n') || 'No readable family members to show.')
                    .setColor(0x27ae60)
                ],
                files: [{
                    attachment: treeBuffer,
                    name: 'family-tree.png'
                }]
            };

            await interaction.editReply(payload);
        } catch (error) {
            console.error('Error in family command:', error);
            await reportError(error, {
                commandName: 'family',
                userId: interaction.user.id,
                guildId: interaction.guildId
            });

            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'An error occurred while generating your family tree image.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while generating your family tree image.',
                    ephemeral: true
                });
            }
        }
    }
};