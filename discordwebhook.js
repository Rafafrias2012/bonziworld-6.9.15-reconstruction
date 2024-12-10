// discordwebhook.js
const https = require('https');
const url = require('url');

function sendLogToDiscord(message, type = 'info', name = 'Anonymous') {
    // Replace with your actual Discord webhook URL
    const webhookURL = 'https://discord.com/api/webhooks/1316097241576116254/MmRVAGVC7I0akN2bPnqQo5OlGD9_ticDNxfMkWS8xGKbessEJmh5cNqquCdklhkEqeFU';

    // Parse the webhook URL
    const webhookParsed = url.parse(webhookURL);

    // Prepare the message payload
    const payload = JSON.stringify({
        content: `**${name}**: ${message}`,
        embeds: [{
            color: type === 'info' ? 3066993 : 15158332, // Green for info, red for error
            author: {
                name: name,
            },
            description: message,
            fields: [
                {
                    name: 'Type',
                    value: type,
                    inline: true
                }
            ],
            timestamp: new Date().toISOString()
        }]
    });

    // Prepare the request options
    const options = {
        hostname: webhookParsed.hostname,
        path: webhookParsed.path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': payload.length
        }
    };

    // Create the request
    const req = https.request(options, (res) => {
        // Optional: Handle response
        res.on('data', (d) => {
            // Optionally log response
        });
    });

    // Handle errors
    req.on('error', (error) => {
        console.error('Error sending Discord webhook:', error);
    });

    // Send the payload
    req.write(payload);
    req.end();
}

module.exports = sendLogToDiscord
