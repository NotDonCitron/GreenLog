import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TimelineSection } from './timeline-section';
import type { GrowComment, GrowEntry, Plant } from '@/lib/types';

describe('TimelineSection', () => {
  it('derives the displayed grow day from start_date when entry day_number is missing', () => {
    const entries: GrowEntry[] = [
      {
        id: 'entry-1',
        grow_id: 'grow-1',
        user_id: 'user-1',
        entry_type: 'note',
        content: { note_text: 'Week two check-in' },
        entry_date: '2026-04-15',
        created_at: '2026-04-15T10:00:00.000Z',
      },
    ];

    render(
      <TimelineSection
        entries={entries}
        comments={[]}
        growStartDate="2026-04-01"
      />
    );

    expect(screen.getByText('Tag 15')).toBeTruthy();
  });

  it('shows affected plant names for plant-scoped entries', () => {
    const entries: GrowEntry[] = [
      {
        id: 'entry-1',
        grow_id: 'grow-1',
        user_id: 'user-1',
        entry_type: 'watering',
        content: {
          amount_liters: 2,
          affected_plant_ids: ['plant-1', 'plant-3'],
        },
        entry_date: '2026-04-15',
        created_at: '2026-04-15T10:00:00.000Z',
      },
    ];
    const plants = [
      { id: 'plant-1', plant_name: 'Alpha' },
      { id: 'plant-2', plant_name: 'Beta' },
      { id: 'plant-3', plant_name: 'Gamma' },
    ] as Plant[];

    render(
      <TimelineSection
        entries={entries}
        comments={[]}
        growStartDate="2026-04-01"
        plants={plants}
      />
    );

    expect(screen.getByText('Alpha, Gamma')).toBeTruthy();
  });

  it('filters entries by log type', () => {
    const entries: GrowEntry[] = [
      {
        id: 'watering-entry',
        grow_id: 'grow-1',
        user_id: 'user-1',
        entry_type: 'watering',
        content: { amount_liters: 2 },
        entry_date: '2026-04-15',
        created_at: '2026-04-15T10:00:00.000Z',
      },
      {
        id: 'feeding-entry',
        grow_id: 'grow-1',
        user_id: 'user-1',
        entry_type: 'feeding',
        content: { nutrient: 'BioBloom', amount: '5ml/L' },
        entry_date: '2026-04-15',
        created_at: '2026-04-15T11:00:00.000Z',
      },
    ];

    render(
      <TimelineSection
        entries={entries}
        comments={[]}
        growStartDate="2026-04-01"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Füttern' }));

    expect(screen.getByText('BioBloom')).toBeTruthy();
    expect(screen.queryByText('2L gegossen')).toBeNull();
  });

  it('filters entries by affected plant', () => {
    const entries: GrowEntry[] = [
      {
        id: 'alpha-entry',
        grow_id: 'grow-1',
        user_id: 'user-1',
        entry_type: 'watering',
        content: {
          amount_liters: 2,
          affected_plant_ids: ['plant-1'],
        },
        entry_date: '2026-04-15',
        created_at: '2026-04-15T10:00:00.000Z',
      },
      {
        id: 'beta-entry',
        grow_id: 'grow-1',
        user_id: 'user-1',
        entry_type: 'feeding',
        content: {
          nutrient: 'BioBloom',
          amount: '5ml/L',
          affected_plant_ids: ['plant-2'],
        },
        entry_date: '2026-04-15',
        created_at: '2026-04-15T11:00:00.000Z',
      },
    ];
    const plants = [
      { id: 'plant-1', plant_name: 'Alpha' },
      { id: 'plant-2', plant_name: 'Beta' },
    ] as Plant[];

    render(
      <TimelineSection
        entries={entries}
        comments={[]}
        growStartDate="2026-04-01"
        plants={plants}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }));

    expect(screen.getByText('2L gegossen')).toBeTruthy();
    expect(screen.queryByText('BioBloom')).toBeNull();
  });

  it('renders signed private photo URLs when a photo entry is expanded', () => {
    const entries: GrowEntry[] = [
      {
        id: 'photo-entry',
        grow_id: 'grow-1',
        user_id: 'user-1',
        entry_type: 'photo',
        content: {
          photo_path: 'user-1/grow-1/photo.webp',
          signed_photo_url: 'https://example.supabase.co/storage/v1/object/sign/grow-entry-photos/photo.webp?token=signed',
        },
        entry_date: '2026-04-15',
        created_at: '2026-04-15T10:00:00.000Z',
      },
    ];

    render(
      <TimelineSection
        entries={entries}
        comments={[]}
        growStartDate="2026-04-01"
      />
    );

    fireEvent.click(screen.getByText('📷 Foto hinzugefügt'));

    expect(screen.getByAltText('Foto 1').getAttribute('src')).toBe(
      'https://example.supabase.co/storage/v1/object/sign/grow-entry-photos/photo.webp?token=signed'
    );
  });

  it('does not render grow comment content while comments are paused', () => {
    const entries: GrowEntry[] = [
      {
        id: 'entry-1',
        grow_id: 'grow-1',
        user_id: 'user-1',
        entry_type: 'note',
        content: { note_text: 'Week two check-in' },
        entry_date: '2026-04-15',
        created_at: '2026-04-15T10:00:00.000Z',
      },
    ];
    const comments: GrowComment[] = [
      {
        id: 'comment-1',
        grow_entry_id: 'entry-1',
        user_id: 'user-2',
        comment: 'This should not be public in beta',
        created_at: '2026-04-15T11:00:00.000Z',
      },
    ];

    render(
      <TimelineSection
        entries={entries}
        comments={comments}
        growStartDate="2026-04-01"
      />
    );

    fireEvent.click(screen.getByText('Week two check-in'));

    expect(screen.getByText('Kommentare sind in der Beta pausiert')).toBeTruthy();
    expect(screen.queryByText('This should not be public in beta')).toBeNull();
    expect(screen.queryByPlaceholderText('Kommentar schreiben...')).toBeNull();
  });
});
