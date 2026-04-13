import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/grow-entries - Create a grow entry with EC/Wasser tracking
export async function POST(request: NextRequest) {
  const supabase = createClient();

  const {
    grow_id,
    day_number,
    title,
    notes,
    image_url,
    height_cm,
    temperature,
    humidity,
    ph_value,         // Wasser pH
    ec_value,         // Wasser EC (Leitfähigkeit)
    water_temperature, // Wassertemperatur
    nutrient_dose      // Dünger-Dosierung
  } = await request.json();

  if (!grow_id) {
    return NextResponse.json({ error: 'grow_id is required' }, { status: 400 });
  }

  // Get grow to verify ownership
  const { data: grow, error: growError } = await supabase
    .from('grows')
    .select('user_id')
    .eq('id', grow_id)
    .single();

  if (growError || !grow) {
    return NextResponse.json({ error: 'Grow not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('grow_entries')
    .insert({
      grow_id,
      day_number: day_number || null,
      title: title || null,
      notes: notes || null,
      image_url: image_url || null,
      height_cm: height_cm || null,
      temperature: temperature || null,
      humidity: humidity || null,
      ph_value: ph_value || null,
      ec_value: ec_value || null,
      water_temperature: water_temperature || null,
      nutrient_dose: nutrient_dose || null
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
