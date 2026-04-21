export const name = 'wikimedia';
export const reliability = 0.5;
export const fieldStrengths = ['image_url'];

export async function* fetchAll(limiter, strainNames) {
  if (!strainNames || strainNames.length === 0) {
    console.warn(`  ⚠️  [${name}] No strain names provided. Wikimedia requires a name list from DB.`);
    return;
  }

  for (const strainName of strainNames) {
    const images = await findWikimediaImages(strainName);
    if (images.length > 0) {
      yield [{
        name: strainName,
        strain_type: null,
        description: null,
        thc: null,
        cbd: null,
        terpene_profile: [],
        flavor_profile: [],
        effect_list: [],
        image: images[0].url,
        image_attribution: {
          source: 'wikimedia',
          author: images[0].author,
          license: images[0].license,
          page_url: images[0].pageUrl,
        },
      }];
    }
    await new Promise(r => setTimeout(r, 1000));
  }
}

async function findWikimediaImages(strainName) {
  const searchUrl = 'https://commons.wikimedia.org/w/api.php?' +
    'action=query&list=search&srsearch=' + encodeURIComponent(strainName + ' cannabis bud') +
    '&srnamespace=6&format=json&origin=*&srlimit=5';

  try {
    const response = await fetch(searchUrl, {
      headers: { 'User-Agent': 'GreenLog-Canon-Ingest/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    const data = await response.json();
    const results = data.query?.search || [];

    const images = [];
    for (const result of results) {
      const title = result.title.toLowerCase();
      if (title.includes('3d') || title.includes('render') ||
        title.includes('cartoon') || title.includes('icon') ||
        title.includes('logo') || title.includes('seedling')) continue;

      const infoUrl = 'https://commons.wikimedia.org/w/api.php?' +
        'action=query&titles=' + encodeURIComponent(result.title) +
        '&prop=imageinfo&iiprop=url|extmeta' +
        '&iiextmetadata=Artist|LicenseShortName&format=json&origin=*';

      try {
        const infoResponse = await fetch(infoUrl, {
          headers: { 'User-Agent': 'GreenLog-Canon-Ingest/1.0' },
          signal: AbortSignal.timeout(10000),
        });
        const infoData = await infoResponse.json();
        const pages = infoData.query?.pages || {};
        const page = Object.values(pages)[0];
        const imgInfo = page?.imageinfo?.[0];

        if (imgInfo?.thumburl || imgInfo?.url) {
          const author = (imgInfo.extmeta?.Artist?.value || 'Unknown')
            .replace(/<[^>]+>/g, '').trim();
          const license = imgInfo.extmeta?.LicenseShortName?.value || 'CC BY-SA';
          images.push({
            url: imgInfo.thumburl || imgInfo.url,
            author,
            license,
            pageUrl: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(result.title),
          });
        }
      } catch {}
    }
    return images;
  } catch {
    return [];
  }
}
