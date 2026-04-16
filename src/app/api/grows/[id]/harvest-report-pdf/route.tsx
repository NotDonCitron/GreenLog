import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient as createClient } from '@/lib/supabase/server';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { jsPDF } from 'jspdf';

// German labels for consumption methods
const consumptionMethodLabels: Record<string, string> = {
  vaporizer: 'Verdampfer (Vaporizer)',
  joint: 'Joint',
  bong: 'Bong',
  pipe: 'Pfeife',
  edible: 'Essbar (Edibles)',
  oil: 'Öl / Konzentrat',
  topical: 'Äußerlich (Topisch)',
  other: 'Sonstiges'
};

const moodLabels: Record<string, string> = {
  neutral: 'Neutral',
  entspannt: 'Entspannt',
  aktiv: 'Aktiv',
  müde: 'Müde',
  gestresst: 'Gestresst',
  fröhlich: 'Fröhlich',
  traurig: 'Traurig',
  anderes: 'Anderes'
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch grow with entries and strain info
  const { data: grow, error: growError } = await supabase
    .from('grows')
    .select(`
      *,
      strains(name, type, thc_min, thc_max, cbd_min, cbd_max, terpenes, effects)
    `)
    .eq('id', id)
    .single();

  if (growError || !grow) {
    return NextResponse.json({ error: 'Grow not found' }, { status: 404 });
  }

  // Fetch grow entries (chronological)
  const { data: entries } = await supabase
    .from('grow_entries')
    .select('*')
    .eq('grow_id', id)
    .order('day_number', { ascending: true });

  // Generate PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('GreenLog', pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(14);
  doc.text('Ernte-Dokumentation', pageWidth / 2, y, { align: 'center' });
  y += 15;

  // PROMINENT Disclaimer Box (LEGAL)
  // Background box
  doc.setFillColor(255, 107, 0, 8); // orange with alpha
  doc.setDrawColor(255, 107, 0, 48); // orange border
  doc.roundedRect(15, y, pageWidth - 30, 22, 3, 3, 'FD');

  // Warning icon
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 107, 0);
  doc.text('⚠️', 20, y + 9);

  // Disclaimer text
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 107, 0);
  doc.text('ERNTE-DOKUMENTATION — PRIVAT', 30, y + 7);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(
    'Ausschliesslich zur persönlichen Dokumentation. Kein Handel, keine Weitergabe an Dritte. (§ 9 Abs. 2 KCanG)',
    30, y + 14
  );

  doc.setTextColor(0, 0, 0);
  y += 28;

  // Grow Info Box
  doc.setFillColor(245, 245, 245);
  doc.rect(15, y, pageWidth - 30, 50, 'F');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(grow.title, 20, y + 8);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  y += 15;
  
  const strainName = grow.strains?.name || 'Unbekannte Sorte';
  const strainType = grow.strains?.type || 'hybrid';
  doc.text(`Sorte: ${strainName} (${strainType})`, 20, y);
  y += 6;
  
  doc.text(`Art: ${grow.grow_type === 'indoor' ? 'Indoor' : grow.grow_type === 'outdoor' ? 'Outdoor' : 'Gewächshaus'}`, 20, y);
  y += 6;
  
  if (grow.start_date) {
    doc.text(`Startdatum: ${new Date(grow.start_date).toLocaleDateString('de-DE')}`, 20, y);
    y += 6;
  }
  
  if (grow.harvest_date) {
    doc.text(`Erntedatum: ${new Date(grow.harvest_date).toLocaleDateString('de-DE')}`, 20, y);
    y += 6;
  }
  
  if (grow.yield_grams) {
    doc.text(`Ertrag: ${grow.yield_grams} g`, 20, y);
    y += 6;
  }

  // Terpene (if available)
  if (grow.strains?.terpenes && grow.strains.terpenes.length > 0) {
    y += 4;
    doc.text(`Terpene: ${(grow.strains.terpenes as string[]).join(', ')}`, 20, y);
  }

  y += 35;

  // Grow Notes
  if (grow.grow_notes) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notizen:', 20, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(grow.grow_notes, pageWidth - 40);
    doc.text(noteLines, 20, y);
    y += noteLines.length * 5 + 10;
  }

  // Growth Timeline Summary
  if (entries && entries.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Wachstums-Verlauf', 20, y);
    y += 10;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // Group entries by week
    const entriesByWeek: Record<number, typeof entries> = {};
    for (const entry of entries) {
      const week = Math.ceil((entry.day_number || 0) / 7);
      if (!entriesByWeek[week]) entriesByWeek[week] = [];
      entriesByWeek[week].push(entry);
    }

    for (const [week, weekEntries] of Object.entries(entriesByWeek)) {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Woche ${week}`, 20, y);
      y += 5;
      doc.setFont('helvetica', 'normal');

      for (const entry of weekEntries.slice(0, 3)) { // Max 3 entries per week in PDF
        const date = entry.created_at ? new Date(entry.created_at).toLocaleDateString('de-DE') : '';
        let line = `Tag ${entry.day_number || '?'} (${date})`;
        if (entry.ph_value) line += ` | pH: ${entry.ph_value}`;
        if (entry.ec_value) line += ` | EC: ${entry.ec_value} mS/cm`;
        if (entry.water_temperature) line += ` | Wassertemp: ${entry.water_temperature}°C`;
        if (entry.height_cm) line += ` | Höhe: ${entry.height_cm} cm`;
        
        doc.text(line, 25, y);
        y += 4;

        if (entry.notes) {
          const noteLines = doc.splitTextToSize(`  ${entry.notes}`, pageWidth - 50);
          doc.text(noteLines, 25, y);
          y += noteLines.length * 4;
        }
      }
      y += 5;
    }
  }

  // Footer - smaller since top disclaimer exists
  const footerY = 285;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Erstellt mit GreenLog am ${new Date().toLocaleDateString('de-DE')} — Dokumentationszweck, keine Rechtsaussage`,
    pageWidth / 2, footerY, { align: 'center' }
  );

  // Return as PDF
  const pdfBuffer = doc.output('arraybuffer');
  
  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="erntebericht-${grow.id}.pdf"`
    }
  });
}
