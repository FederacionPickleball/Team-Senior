// Función de servidor: lee y elimina respuestas del formulario "encuesta-team-senior".
// La clave de API de Netlify (NETLIFY_API_TOKEN) y el SITE_ID viven acá,
// como variables de entorno privadas — nunca se envían al navegador.

const PANEL_PASSWORD = "TEAMSENIOR2026";
const FORM_NAME = "encuesta-team-senior";

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Body inválido" }) };
  }

  if (body.clave !== PANEL_PASSWORD) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Clave incorrecta" }) };
  }

  const API_TOKEN = process.env.NETLIFY_API_TOKEN;
  const SITE_ID = process.env.NETLIFY_SITE_ID;

  if (!API_TOKEN || !SITE_ID) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Falta configurar NETLIFY_API_TOKEN o NETLIFY_SITE_ID en las variables de entorno del sitio." }),
    };
  }

  const apiHeaders = { Authorization: "Bearer " + API_TOKEN };

  try {
    if (body.action === "list") {
      // 1. Buscar el ID del formulario por nombre
      const formsResp = await fetch(`https://api.netlify.com/api/v1/sites/${SITE_ID}/forms`, { headers: apiHeaders });
      if (!formsResp.ok) throw new Error("No se pudo listar formularios (" + formsResp.status + ")");
      const forms = await formsResp.json();
      const form = forms.find((f) => f.name === FORM_NAME);
      if (!form) {
        return { statusCode: 200, headers, body: JSON.stringify({ respuestas: [] }) };
      }

      // 2. Traer las respuestas de ese formulario
      const subResp = await fetch(`https://api.netlify.com/api/v1/forms/${form.id}/submissions`, { headers: apiHeaders });
      if (!subResp.ok) throw new Error("No se pudieron traer las respuestas (" + subResp.status + ")");
      const submissions = await subResp.json();

      const respuestas = submissions.map((s) => ({
        id: s.id,
        fecha: s.created_at,
        datos: s.data,
      }));

      return { statusCode: 200, headers, body: JSON.stringify({ respuestas }) };
    }

    if (body.action === "delete") {
      if (!body.id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Falta el id de la respuesta" }) };
      }
      const delResp = await fetch(`https://api.netlify.com/api/v1/submissions/${body.id}`, {
        method: "DELETE",
        headers: apiHeaders,
      });
      if (!delResp.ok && delResp.status !== 204) {
        throw new Error("No se pudo eliminar (" + delResp.status + ")");
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Acción no reconocida" }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
