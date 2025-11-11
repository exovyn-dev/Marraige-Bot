const { EmbedBuilder, WebhookClient } = require('discord.js');
const { errorWebhook } = require('../../config/config.json');

let webhookClient = null;

// Initialize webhook client
function initializeWebhook() {
    if (errorWebhook && errorWebhook.url) {
        try {
            webhookClient = new WebhookClient({ url: errorWebhook.url });
        } catch (err) {
            console.error('Failed to initialize error webhook:', err);
        }
    }
}

// Send error to webhook
async function reportError(error, context = {}) {
    console.error('Error:', error);

    if (!webhookClient) {
        initializeWebhook();
    }

    if (!webhookClient) {
        console.warn('Error webhook not configured, skipping webhook send');
        return;
    }

    try {
        const errorEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('❌ Bot Error')
            .setDescription(`\`\`\`${error.message || String(error).substring(0, 100)}\`\`\``)
            .addFields(
                { name: 'Command', value: context.commandName || 'Unknown', inline: true },
                { name: 'User', value: context.userId ? `<@${context.userId}>` : 'Unknown', inline: true },
                { name: 'Guild', value: context.guildId ? `\`${context.guildId}\`` : 'DM', inline: true },
                { 
                    name: 'Stack Trace', 
                    value: `\`\`\`${(error.stack || error).substring(0, 1000)}\`\`\`` 
                }
            )
            .setTimestamp();

        await webhookClient.send({
            embeds: [errorEmbed],
            username: errorWebhook.name || 'Exo Marraige Bot',
            avatarURL: errorWebhook.avatarUrl
        });
    } catch (webhookError) {
        console.error('Failed to send error to webhook:', webhookError);
    }
}

// Defer and handle errors for interaction
async function deferAndCatch(interaction, executeFunc, options = {}) {
    try {
        // Only defer if not already deferred
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: options.ephemeral || false });
        }
        
        await executeFunc();
    } catch (error) {
        await reportError(error, {
            commandName: interaction.commandName,
            userId: interaction.user.id,
            guildId: interaction.guildId
        });

        const errorMessage = options.errorMessage || 'An error occurred while processing your request.';
        if (interaction.deferred) {
            await interaction.editReply({ content: errorMessage, ephemeral: true });
        } else if (!interaction.replied) {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        }
    }
}

module.exports = {
    initializeWebhook,
    reportError,
    deferAndCatch
};
