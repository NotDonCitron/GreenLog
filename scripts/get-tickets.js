const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('Keine .env.local gefunden.');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase Credentials fehlen.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getTickets() {
  console.log('--- HOLEN DER TICKETS INKL. ABSEGNUNGEN ---\n');

  const { data: tickets, error } = await supabase
    .from('feedback_tickets')
    .select(`
      *,
      profiles!feedback_tickets_user_id_fkey(username),
      ticket_approvals(user_id)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fehler:', error.message);
    return;
  }

  if (!tickets || tickets.length === 0) {
    console.log('Keine Tickets gefunden.');
    return;
  }

  let markdown = `# 📋 GreenLog Feedback Tickets\n\n`;
  markdown += `Stand: ${new Date().toLocaleString('de-DE')}\n\n`;

  tickets.forEach(ticket => {
    const statusEmoji = { open: '🟢', in_progress: '🟡', resolved: '✅', closed: '🔘' }[ticket.status] || '❓';
    const priorityEmoji = { low: '☕', medium: '⚡', high: '🔥', critical: '🚨' }[ticket.priority] || '⚪';
    const approvalCount = ticket.ticket_approvals?.length || 0;
    const isReady = approvalCount >= 2; // Beispiel: 2 Mitarbeiter müssen absegnen

    markdown += `## ${statusEmoji} ${ticket.title} ${isReady ? '🚀 [BEREIT]' : ''}\n`;
    markdown += `- **ID**: \`${ticket.id}\`\n`;
    markdown += `- **Erstellt von**: @${ticket.profiles?.username || 'unbekannt'}\n`;
    markdown += `- **Absegnungen**: ${'👍'.repeat(approvalCount)} (${approvalCount}/2)\n`;
    markdown += `- **Priorität**: ${priorityEmoji} ${ticket.priority.toUpperCase()}\n`;
    markdown += `- **Kategorie**: ${ticket.category}\n`;
    markdown += `- **Status**: ${ticket.status}\n`;
    markdown += `- **URL**: [${ticket.page_url}](${ticket.page_url})\n\n`;
    markdown += `### Beschreibung\n${ticket.description}\n\n`;
    
    if (ticket.context && Object.keys(ticket.context).length > 0) {
      markdown += `### Technischer Kontext\n\`\`\`json\n${JSON.stringify(ticket.context, null, 2)}\n\`\`\`\n`;
    }
    
    markdown += `\n---\n\n`;
  });

  fs.writeFileSync(path.resolve(__dirname, '../TICKETS.md'), markdown);
  console.log('✅ TICKETS.md wurde aktualisiert (inkl. Absegnungen).');
}

getTickets();
