import template from './template.html';

async function openAI(model, messages, apiKey) {
  const apiURL = 'https://api.openai.com/v1/chat/completions';
  const response = await fetch(apiURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      messages: messages,
      model: model,
      max_tokens: 4096,
      temperature: 0.1
    })
  });
  if (!response.ok) {
    return new Response(await response.text(), { status: 400});
  }
  const resp = await response.json();
  return new Response(resp['choices'][0]['message']['content'].toString());
}

export default {
  async fetch(request, env) {
    // proxy
    const url = new URL(request.url);
    if (url.pathname.startsWith("/v1")) {
      const headers_Origin = request.headers.get("Access-Control-Allow-Origin") || "*"
      const modifiedRequest = new Request('https://api.openai.com' + url.pathname + url.search, {
          method: request.method,
          headers: request.headers,
          body: request.body,
      });
      const response = await fetch(modifiedRequest);
      const modifiedResponse = new Response(response.body, response);
      modifiedResponse.headers.set('Access-Control-Allow-Origin', headers_Origin);
      return modifiedResponse;
    }

    // 安全检查
    const auth = request.headers.get('Authorization');
    if (!auth || auth !== `Basic ${env.TOKEN}`) {
      return new Response(
        `Login Required`,
        { headers: { 'Content-Type': 'text/html','WWW-Authenticate': 'Basic realm="Login Required"' }, status: 401 }
      );
    }

    // 处理页面请求
    if(request.method == "GET"){
      const body = template.toString();
      return new Response(body, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    if (request.method === "OPTIONS") {
      return new Response("");
    }

    // 处理api请求
    const body = await request.text();
    const reqJson = JSON.parse(body)
    return openAI(reqJson.model,reqJson.messages,`${env.OPENAI_KEY}`);
  }
};
