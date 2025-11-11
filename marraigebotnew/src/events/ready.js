const { Events, ActivityType } = require('discord.js');
const { prefix } = require('../../config/config.json');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);

        try {
            const activityName = `/help | Prefix: ${prefix}`;
            client.user.setPresence({
                activities: [{ name: activityName, type: ActivityType.Listening }],
                status: 'online'
            });
            console.log('Presence set to:', activityName);
        } catch (err) {
            console.error('Failed to set presence:', err);
        }
    },
};