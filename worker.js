import template from './template.html';

// 检查登录
function checkLogin(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || auth !== `Basic ${env.TOKEN}`) {
    return false;
  }
  return true;
}

// openai web服务
async function openAI(request, env) {
  const body = await request.text();
  const reqJson = JSON.parse(body);
  const apiURL = 'https://api.openai.com/v1/chat/completions';
  const response = await fetch(apiURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENAI_KEY}`
    },
    body: JSON.stringify({
      messages: reqJson.messages,
      model: reqJson.model,
      temperature: 0.1
    })
  });
  if (!response.ok) {
    return new Response(await response.text(), { status: 400});
  }
  const resp = await response.json();
  const chatSession = {
    "request":reqJson.messages,
    "response":resp
  };
  if (env.ChatRecordR2){
    await env.ChatRecordR2.put(reqJson.chatUniqueId, JSON.stringify(chatSession));
  }
  return new Response(resp['choices'][0]['message']['content'].toString());
}

// session
async function session(request, env) {
  const url = new URL(request.url);
  const chatUniqueId = url.pathname.slice("/session/".length);
  if (env.ChatRecordR2){
    if (chatUniqueId == "all"){
      const queryOptions = {
        limit: 500,
        prefix: "id-",
      }
      const objects = await env.ChatRecordR2.list(queryOptions);
      return new Response(JSON.stringify(objects), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const object = await env.ChatRecordR2.get(chatUniqueId);
    if (object != null) {
      return new Response(object.body, {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  return new Response('Object Not Found', { status: 404 });
}

// 页面服务
async function home(request, env) {
  const body = template.toString();
  return new Response(body, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// openai api代理
async function proxy(request, env) {
  const url = new URL(request.url);
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

export default {
  async fetch(request, env) {
    // proxy
    const url = new URL(request.url);
    if (url.pathname.startsWith("/v1")) {
      return proxy(request, env);
    }

    // 安全检查
    if (!checkLogin(request, env)) {
      return new Response(
        `Login Required`,
        { headers: { 'Content-Type': 'text/html','WWW-Authenticate': 'Basic realm="Login Required"' }, status: 401 }
      );
    }

    // 处理api请求
    if (url.pathname.startsWith("/api")) {
      return openAI(request, env);
    }
    
    // 处理session请求
    if (url.pathname.startsWith("/session")) {
      return session(request, env);
    }

    // 处理页面请求
    if(url.pathname == "/"){
      return home(request, env);
    }

    // 默认返回空
    return new Response("");
  }
};
