const db = require('../utils/database/database');
const FamilyTreeGenerator = require('../utils/FamilyTreeGenerator');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'tree',
    async execute(message, args) {
        const relations = await db.getRelations(message.author.id);

        const inverse = (type) => {
            if (type === 'parent') return 'child';
            if (type === 'child') return 'parent';
            return type;
        };

        const relMap = new Map();
        for (const r of relations) {
            const otherId = r.userId === message.author.id ? r.relatedUserId : r.userId;
            let relType = r.userId === message.author.id ? r.relationType : inverse(r.relationType);
            if (!['parent','child','sibling'].includes(relType)) continue;
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
                .setDescription('No blood relatives found.');
            return message.reply({ embeds: [embed] });
        }

        const grouped = { parent: [], child: [], sibling: [] };
        for (const [otherId, type] of relMap.entries()) grouped[type].push(otherId);

        const formatUser = async (id) => {
            const cached = message.client.users.cache.get(id);
            if (cached) return `${cached.tag} (<@${id}>)`;
            try {
                const fetched = await message.client.users.fetch(id);
                return `${fetched.tag} (<@${id}>)`;
            } catch {
                return `<@${id}>`;
            }
        };

        const parts = [];
        for (const type of ['parent','child','sibling']) {
            if (grouped[type].length === 0) continue;
            const users = await Promise.all(grouped[type].map(id => formatUser(id)));
            parts.push(`**${type[0].toUpperCase() + type.slice(1)}s:** ${users.join(', ')}`);
        }

        const embed = new EmbedBuilder()
            .setColor(0x1abc9c)
            .setTitle(`Blood relatives of ${message.author.tag}`)
            .setDescription(parts.join('\n'));

        message.reply({ embeds: [embed] });
    }
};