exports.handler = async function () {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ok: true,
      project: "betvision-premium",
      ping: new Date().toISOString(),
    }),
  };
};
