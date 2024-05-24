import validator from "./validator.js"
// `ajv compile` generates func names if wildcard is used for input. Destructure..
const { 'functions/app_routes_schema.json': validateAppRoutesSchema, 'functions/marketing_routes_schema.json': validateMarketingRoutesSchema } = validator

export async function onRequest(context) {
  const request = context.request;

  // Check if request method is POST
  if (request.method !== "POST") {
    return new Response("Only POST requests are allowed.", {
      status: 405,
    });
  }

  try {
    //Parse JSON from request body

    let buff = await request.arrayBuffer();
    let requestSize = buff.byteLength;
    if (requestSize > 1024 * 1024) {
      return new Response(
        "Request exceeded more than 1MB. The request size is " + requestSize,
        {
          status: 400,
        }
      );
    }
    let text = new TextDecoder().decode(buff);
    const json = JSON.parse(text);

    const client_IP = request.headers.get("CF-Connecting-IP").toString();
    json.identity.ip_address = client_IP;
    json.metadata.triggered_at = new Date().toISOString();
    console.log(json);

    let isValid = false
    if (json.metadata.schema_name === "marketing_routes") {
      isValid = validateMarketingRoutesSchema(json).valid;
    } else if (json.metadata.schema_name === "app_routes") {
      isValid = validateAppRoutesSchema(json).valid;
    }

    if (!isValid) {
      if (json.metadata.schema_name === "marketing_routes") {
        return new Response(
          "Invalid JSON: " +
          JSON.stringify(validateMarketingRoutesSchema.errors, null, 2),
          { status: 400 }
        );
      } else if (json.metadata.schema_name === "app_routes") {
        return new Response(
          "Invalid JSON: " +
          JSON.stringify(validateAppRoutesSchema.errors, null, 2),
          { status: 400 }
        );
      } else {
        return new Response("Invalid Body", { status: 400 });
      }
    }

    try {
      await fetch("https://gemini.getbeamer.com/async/event", {
        method: request.method,
        headers: request.headers,
        body: json,
      });
    } catch (e) {
      console.log("Gemini Request Failed: " + error.message);
      return new Response("Unable to Register Event", {
        status: 500,
      });
    }

    return new Response(JSON.stringify(json), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Return response with error message if parsing fails
    console.log(error.message);
    return new Response("Error: " + error.message, {
      status: 500,
    });
  }
}
