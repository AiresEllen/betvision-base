exports.handler = async function (event) {
  try {
    const API_KEY = process.env.API_FOOTBALL_KEY;
    const BASE_URL = "https://v3.football.api-sports.io";

    if (!API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "API_FOOTBALL_KEY não configurada no Netlify",
        }),
      };
    }

    const params = event.queryStringParameters || {};
    const date = params.date;
    const timezone = params.timezone || "America/Sao_Paulo";

    if (!date) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Parâmetro 'date' é obrigatório",
        }),
      };
    }

    const url = new URL(`${BASE_URL}/fixtures`);
    url.searchParams.set("date", date);
    url.searchParams.set("timezone", timezone);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-apisports-key": API_KEY,
      },
    });

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Erro interno ao buscar fixtures",
        details: error.message,
      }),
    };
  }
};
