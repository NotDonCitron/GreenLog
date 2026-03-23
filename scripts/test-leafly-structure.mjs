import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testScrape(slug) {
  const url = `https://www.leafly.com/strains/${slug}`;
  console.log(`Testing ${url}...`);
  
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (response.ok) {
      const html = await response.text();
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
      if (nextDataMatch) {
        const fullData = JSON.parse(nextDataMatch[1]);
        const strain = fullData.props?.pageProps?.strain || {};
        
        console.log("--- AVAILABLE KEYS ---");
        console.log(Object.keys(strain));
        
        console.log("--- STRAIN DATA ---");
        console.log("Name:", strain.name);
        console.log("Description:", strain.description?.substring(0, 100) + "...");
        // ... rest of logs
        console.log("Flavors:", strain.flavors);
        console.log("Effects:", strain.effects);
        console.log("Terps:", strain.terps);
        console.log("Cannabinoids:", JSON.stringify(strain.cannabinoids, null, 2));
        console.log("Category:", strain.category);
        console.log("Lineage:", JSON.stringify(strain.lineage, null, 2));
        console.log("Parents:", JSON.stringify(strain.parents, null, 2));
      } else {
        console.log("No __NEXT_DATA__ found");
      }
    } else {
      console.log("Response not OK:", response.status);
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

testScrape("og-kush");
