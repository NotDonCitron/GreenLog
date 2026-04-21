import { describe, it, expect } from 'vitest';
import { getStrainPublicationSnapshot } from '@/lib/strains/publication';

describe('Strain Publication Gate', () => {
  const validStrain = {
    id: 'test-id',
    name: 'Test Strain',
    slug: 'test-strain',
    type: 'hybrid',
    description: 'A test strain description',
    thc_min: 15.0,
    thc_max: 20.0,
    cbd_min: 1.0,
    cbd_max: 2.0,
    terpenes: ['myrcene', 'limonene'],
    flavors: ['citrus'],
    effects: ['relaxed'],
    image_url: 'https://example.com/image.jpg',
    canonical_image_path: 'str/test-id.jpg',
    primary_source: 'leafly',
  };

  it('allows publication when all required fields are present', () => {
    const snapshot = getStrainPublicationSnapshot(validStrain);
    expect(snapshot.canPublish).toBe(true);
    expect(snapshot.missing).toHaveLength(0);
    expect(snapshot.qualityScore).toBe(100);
  });

  it('blocks publication when name is missing', () => {
    const snapshot = getStrainPublicationSnapshot({ ...validStrain, name: undefined });
    expect(snapshot.canPublish).toBe(false);
    expect(snapshot.missing).toContain('name');
  });

  it('blocks publication when description is empty', () => {
    const snapshot = getStrainPublicationSnapshot({ ...validStrain, description: '' });
    expect(snapshot.canPublish).toBe(false);
    expect(snapshot.missing).toContain('description');
  });

  it('blocks publication when both thc_min and thc_max are null', () => {
    const snapshot = getStrainPublicationSnapshot({ ...validStrain, thc_min: null, thc_max: null });
    expect(snapshot.canPublish).toBe(false);
    expect(snapshot.missing).toContain('thc');
  });

  it('blocks publication when fewer than 2 terpenes', () => {
    const snapshot = getStrainPublicationSnapshot({ ...validStrain, terpenes: ['myrcene'] });
    expect(snapshot.canPublish).toBe(false);
    expect(snapshot.missing).toContain('terpenes');
  });

  it('blocks publication when no flavors', () => {
    const snapshot = getStrainPublicationSnapshot({ ...validStrain, flavors: [] });
    expect(snapshot.canPublish).toBe(false);
    expect(snapshot.missing).toContain('flavors');
  });

  it('blocks publication when no effects', () => {
    const snapshot = getStrainPublicationSnapshot({ ...validStrain, effects: [] });
    expect(snapshot.canPublish).toBe(false);
    expect(snapshot.missing).toContain('effects');
  });

  it('blocks publication when no image', () => {
    const snapshot = getStrainPublicationSnapshot({ ...validStrain, image_url: null, canonical_image_path: null });
    expect(snapshot.canPublish).toBe(false);
    expect(snapshot.missing).toContain('image');
  });

  it('blocks publication when no primary_source', () => {
    const snapshot = getStrainPublicationSnapshot({ ...validStrain, primary_source: '' });
    expect(snapshot.canPublish).toBe(false);
    expect(snapshot.missing).toContain('source');
  });

  it('calculates quality score correctly', () => {
    const snapshot = getStrainPublicationSnapshot({
      ...validStrain,
      terpenes: ['myrcene'],
      flavors: [],
    });
    expect(snapshot.qualityScore).toBe(82);
  });
});
