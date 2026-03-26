const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Lade .env.local aus dem Root-Verzeichnis
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('Keine .env.local gefunden. Bitte stelle sicher, dass NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY gesetzt sind.');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Wir nutzen den Service Role Key für Admin-Zugriff, falls vorhanden
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase Credentials fehlen in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getTickets() {
  console.log('--- HOLEN DER TICKETS AUS SUPABASE ---
');

  const { data: tickets, error } = await supabase
    .from('feedback_tickets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fehler beim Abrufen der Tickets:', error.message);
    return;
  }

  if (!tickets || tickets.length === 0) {
    console.log('Keine Tickets gefunden. Deine Freunde scheinen wunschlos glücklich zu sein! 🌿');
    return;
  }

  let markdown = `# 📋 GreenLog Feedback Tickets

`;
  markdown += `Stand: ${new Date().toLocaleString('de-DE')}

`;

  tickets.forEach(ticket => {
    const statusEmoji = {
      open: '🟢',
      in_progress: '🟡',
      resolved: '✅',
      closed: '🔘'
    }[ticket.status] || '❓';

    const priorityEmoji = {
      low: '☕',
      medium: '⚡',
      high: '🔥',
      critical: '🚨'
    }[ticket.priority] || '⚪';

    markdown += `## ${statusEmoji} ${ticket.title}
`;
    markdown += `- **ID**: `${ticket.id}`
`;
    markdown += `- **Priorität**: ${priorityEmoji} ${ticket.priority.toUpperCase()}
`;
    markdown += `- **Kategorie**: ${ticket.category}
`;
    markdown += `- **Status**: ${ticket.status}
`;
    markdown += `- **Erstellt am**: ${new Date(ticket.created_at).toLocaleString('de-DE')}
`;
    markdown += `- **URL**: [${ticket.page_url}](${ticket.page_url})

`;
    markdown += `### Beschreibung
${ticket.description}

`;
    
    if (ticket.context && Object.keys(ticket.context).length > 0) {
      markdown += `### Technischer Kontext
```json
${JSON.stringify(ticket.context, null, 2)}
```
`;
    }
    
    markdown += `
---

`;
  });

  console.log(markdown);
  
  // Optional: In eine Datei schreiben für Claude
  fs.writeFileSync(path.resolve(__dirname, '../TICKETS.md'), markdown);
  console.log('✅ Tickets wurden in TICKETS.md gespeichert.');
}

getTickets();
