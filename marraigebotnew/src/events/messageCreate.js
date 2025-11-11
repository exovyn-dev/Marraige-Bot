const { Events } = require('discord.js');
const { prefix } = require('../../config/config.json');
const { reportError } = require('../utils/errorHandler');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignore bot messages and messages without prefix
        if (message.author.bot) return;
        if (!message.content.startsWith(prefix)) return;

        // Extract command and arguments
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        // Get command from prefixCommands collection
        const command = message.client.prefixCommands.get(commandName);

        if (!command) {
            return; // Command doesn't exist, silently ignore
        }
        // Send a quick processing confirmation so users know the bot picked up the command
        let processingMessage = null;
        try {
            processingMessage = await message.reply({ content: `Processing ${prefix}${commandName}...`, allowedMentions: { repliedUser: false } });
        } catch (err) {
            // ignore failure to send processing message
            processingMessage = null;
        }

        try {
            // Execute the prefix command
            await command.execute(message, args);

            // Edit the processing message to indicate completion, then delete after a short delay
            if (processingMessage) {
                try {
                    await processingMessage.edit({ content: `Processed ${prefix}${commandName}.` });
                    setTimeout(() => processingMessage.delete().catch(() => {}), 5000);
                } catch (e) {
                    // ignore edit/delete errors
                }
            }
        } catch (error) {
            console.error(`Error executing prefix command ${commandName}:`, error);

            await reportError(error, {
                commandName: commandName,
                userId: message.author.id,
                guildId: message.guildId
            });

            try {
                await message.reply({
                    content: 'There was an error executing this command.',
                    allowedMentions: { repliedUser: false }
                });
            } catch (replyError) {
                console.error('Failed to send error message:', replyError);
            }
        }
    },
};
