import crypto from "crypto";

function generateSign(params: Record<string, string>, appSecret: string): string {
  const sortedKeys = Object.keys(params).sort();
  let concatenated = "";
  for (const key of sortedKeys) {
    concatenated += key + params[key];
  }
  const rawString = appSecret + concatenated + appSecret;
  return crypto.createHash("md5").update(rawString, "utf8").digest("hex").toUpperCase();
}

async function testGateway(methodName: string) {
  const appKey = "538082";
  const appSecret = "Y2jDHbgCfGXQCFccXtjcvdggP3hVybPG";

  const now = Date.now();
  const params: Record<string, string> = {
    app_key: appKey,
    timestamp: String(now),
    sign_method: "md5",
    v: "2.0",
    format: "json",
    method: methodName,
    access_token: "dummy_access_token_val_123",
  };

  if (methodName === "aliexpress.ds.recommend.feed.get") {
    params.feed_name = "Y501";
    params.keywords = "shoes";
    params.page_size = "10";
    params.page_no = "1";
  } else {
    params.product_id = "1005001234567890";
  }

  const sign = generateSign(params, appSecret);
  const allParams = { ...params, sign } as Record<string, string>;

  const queryParts = Object.keys(allParams).sort().map(key => {
    return `${key}=${encodeURIComponent(allParams[key])}`;
  });
  const queryString = queryParts.join("&");

  const GATEWAY = `https://api-sg.aliexpress.com/rest?${queryString}`;
  
  try {
    const response = await fetch(GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const data = await response.json();
    console.log(`[Method: ${methodName}] Response:`, JSON.stringify(data));
  } catch (err: any) {
    console.log(`[Method: ${methodName}] Failed: ${err.message}`);
  }
}

async function run() {
  await testGateway("aliexpress.ds.recommend.feed.get");
  await testGateway("aliexpress.ds.product.get");
}

run();
