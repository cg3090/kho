import { app } from '../../src/server/app';

const getEventUrl = (event) => {
  const host = event.headers?.host || 'localhost';
  const path = event.path || '/';
  const protocol = event.headers?.['x-forwarded-proto'] || 'https';
  const query = event.queryStringParameters && Object.keys(event.queryStringParameters).length
    ? `?${new URLSearchParams(event.queryStringParameters).toString()}`
    : '';

  return `${protocol}://${host}${path}${query}`;
};

export const handler = async (event) => {
  try {
    const url = getEventUrl(event);
    const method = event.httpMethod || 'GET';
    const headers = new Headers(event.headers || {});

    let body;
    if (event.body && !['GET', 'HEAD'].includes(method)) {
      body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;
    }

    const request = new Request(url, {
      method,
      headers,
      body,
      duplex: 'half',
    });

    const response = await app.fetch(request, {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'production',
    });

    const responseHeaders = Object.fromEntries(response.headers.entries());
    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: await response.text(),
      isBase64Encoded: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Netlify API error';
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      },
      body: JSON.stringify({
        success: false,
        connected: false,
        error: message,
      }),
      isBase64Encoded: false,
    };
  }
};
