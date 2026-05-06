exports.handler = async function (event) {
  try {
    const API_KEY = process.env.API_FOOTBALL_KEY;
    const BASE_URL = "https://v3.football.api-sports.io";

    if (!API_KEY) {
      return json(500, { error: "API_FOOTBALL_KEY não configurada" });
    }

    const params = event.queryStringParameters || {};
    const date = params.date;
    const from = params.from;
    const to = params.to;
    const timezone = params.timezone || "America/Sao_Paulo";

    const url = new URL(`${BASE_URL}/fixtures`);

    if (from && to) {
      url.searchParams.set("from", from);
      url.searchParams.set("to", to);
    } else if (date) {
      url.searchParams.set("date", date);
    } else {
      return json(400, { error: "Informe date ou from/to" });
    }

    url.searchParams.set("timezone", timezone);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "x-apisports-key": API_KEY },
    });

    const data = await response.json();

    return json(200, {
      ok: true,
      requestUrl: url.toString(),
      apiStatus: response.status,
      data,
    });
  } catch (error) {
    return json(500, {
      error: "Erro interno ao buscar fixtures",
      details: error.message,
    });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
