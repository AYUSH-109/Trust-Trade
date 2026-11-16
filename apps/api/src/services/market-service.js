const cacheLifetimeMs = 30_000;
let cachedQuote;

function getCoinGeckoUrl() {
  return process.env.COINGECKO_API_URL
    ?? "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr";
}

export async function getEthInrQuote() {
  if (cachedQuote && cachedQuote.expiresAt > Date.now()) {
    return cachedQuote;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(getCoinGeckoUrl(), {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Market data provider returned ${response.status}`);
    }

    const result = await response.json();
    const ethInr = result?.ethereum?.inr;

    if (typeof ethInr !== "number" || !Number.isFinite(ethInr) || ethInr <= 0) {
      throw new Error("Market data provider returned an invalid ETH/INR quote");
    }

    cachedQuote = {
      ethInr,
      ratePaise: Math.round(ethInr * 100),
      fetchedAt: new Date().toISOString(),
      expiresAt: Date.now() + cacheLifetimeMs
    };

    return cachedQuote;
  } finally {
    clearTimeout(timeout);
  }
}
