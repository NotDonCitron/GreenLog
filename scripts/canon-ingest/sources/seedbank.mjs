export const name = 'seedbank';
export const reliability = 0.4;
export const fieldStrengths = ['image_url'];

export async function* fetchAll(limiter, strainNames) {
  if (!strainNames || strainNames.length === 0) {
    console.warn(`  ⚠️  [${name}] No strain names provided. Seedbank requires a name list from DB.`);
    return;
  }

  for (const strainName of strainNames) {
    const images = await findSeedbankImages(strainName);
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
          source: 'seedbank',
          author: images[0].author,
          license: images[0].license,
        },
      }];
    }
    await new Promise(r => setTimeout(r, 1500));
  }
}

async function findSeedbankImages(strainName) {
  const results = [];
  try {
    const apiUrl = 'https://sensiseeds.com/catalog/searchtermautocomplete?term=' + encodeURIComponent(strainName);
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });
    const data = await response.json();
    for (const item of (data || [])) {
      if (item.productwebpurl || item.productpictureurl) {
        results.push({
          url: item.productwebpurl || item.productpictureurl,
          author: 'Sensi Seeds',
          license: 'promotional_use',
        });
      }
    }
  } catch {}
  return results;
}
