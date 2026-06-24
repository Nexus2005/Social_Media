const https = require("https");

function getUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          data: data,
        });
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}

async function testApis() {
  const query = "San";
  const encodedQuery = encodeURIComponent(query);
  const photonUrl = `https://photon.komoot.io/api?q=${encodedQuery}&limit=10`;
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=jsonv2&addressdetails=1&limit=10`;

  console.log("Testing Photon API...");
  try {
    const res = await getUrl(photonUrl);
    console.log(`Photon Status: ${res.status}`);
    console.log(`Photon Data snippet: ${res.data.substring(0, 200)}`);
  } catch (err) {
    console.error("Photon Error:", err.message);
  }

  console.log("\nTesting Nominatim API...");
  try {
    const res = await getUrl(nominatimUrl, {
      "User-Agent": "Cartly-MVP/1.0",
    });
    console.log(`Nominatim Status: ${res.status}`);
    console.log(`Nominatim Data snippet: ${res.data.substring(0, 200)}`);
  } catch (err) {
    console.error("Nominatim Error:", err.message);
  }
}

testApis();
