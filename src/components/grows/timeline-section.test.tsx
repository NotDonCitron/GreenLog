import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TimelineSection } from './timeline-section';
import type { GrowEntry } from '@/lib/types';

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
});
