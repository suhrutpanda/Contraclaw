import express from 'express';
import cors from 'cors';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;
const EMAIL_USER = 'hackathondev462@gmail.com';
const EMAIL_PASS = 'vkovsybfbvpqbfjy';

// In-memory cache for fast frontend rendering
let cachedEmails = [];
let imapStatus = 'initializing'; // initializing, connected, error
let imapError = null;

// Helper to wrap the IMAP connection logic
async function checkInbox() {
    imapStatus = 'connecting';
    
    const client = new ImapFlow({
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        },
        logger: false 
    });

    try {
        await client.connect();
        imapStatus = 'connected';
        imapError = null;
        console.log(`Connected to IMAP as ${EMAIL_USER}`);

        // Select inbox
        let lock = await client.getMailboxLock('INBOX');
        try {
            const messages = client.mailbox.exists;
            if (messages === 0) {
                return;
            }
            
            const start = Math.max(1, messages - 4);
            const sequence = `${start}:*`;

            const fetchedIds = new Set(cachedEmails.map(e => e.id));
            let newEmails = [];

            // Fetch latest 5 messages
            for await (let msg of client.fetch(sequence, { source: true, uid: true })) {
                if (fetchedIds.has(msg.uid.toString())) continue;

                const parsed = await simpleParser(msg.source);
                
                // Process attachments safely
                const attachments = (parsed.attachments || []).map(att => ({
                    filename: att.filename,
                    contentType: att.contentType,
                    size: att.size,
                    contentBase64: att.content.toString('base64')
                }));

                newEmails.push({
                    id: msg.uid.toString(),
                    date: parsed.date || new Date(),
                    subject: parsed.subject || '(No Subject)',
                    from: parsed.from?.text || 'Unknown',
                    text: parsed.text || '',
                    snippet: (parsed.text || '').substring(0, 150) + '...',
                    attachments: attachments
                });
            }

            if (newEmails.length > 0) {
                console.log(`Fetched ${newEmails.length} new emails`);
                // reverse to have newest first
                newEmails.sort((a, b) => b.id - a.id);
                cachedEmails = [...newEmails, ...cachedEmails];
            }
        } finally {
            lock.release();
        }
        await client.logout();
    } catch (err) {
        console.error('IMAP Connection Error:', err.message);
        imapStatus = 'error';
        imapError = err.message;
        try { await client.logout(); } catch (e) {}
    }
}

// Background poller every 30 seconds
setInterval(checkInbox, 30000);

// Also run once immediately
checkInbox();

// API Routes
app.get('/api/local/status', (req, res) => {
    res.json({
        status: imapStatus,
        error: imapError,
        email: EMAIL_USER,
        totalCached: cachedEmails.length
    });
});

app.get('/api/local/inbox', (req, res) => {
    // Return emails. To save bandwidth for the list view, we could strip base64, 
    // but this is local dev so it's fine to return the full object.
    res.json(cachedEmails);
});

// App Startup
app.listen(PORT, () => {
    console.log(`OpenClaw Inbox Monitor Backend running on http://localhost:${PORT}`);
});