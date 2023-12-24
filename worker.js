import template from './template.html';

// 检查登录
function checkLogin(request, env) {
  // if(true) return true;
  const auth = request.headers.get('Authorization');
  if (!auth || auth !== `Basic ${env.TOKEN}`) {
    return false;
  }
  return true;
}

// openai web服务
async function openAI(requestJson, env) {
  const apiURL = 'https://api.openai.com/v1/chat/completions';
  const response = await fetch(apiURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENAI_KEY}`
    },
    body: JSON.stringify({
      messages: requestJson.messages,
      model: requestJson.model,
      temperature: 0.1
    })
  });
  if (!response.ok) {
    return new Response(await response.text(), { status: 400});
  }
  const resp = await response.json();
  const chatSession = {
    "model":requestJson.model,
    "request":requestJson.messages,
    "response":resp
  };
  if (env.ChatRecordR2){
    await env.ChatRecordR2.put(requestJson.chatUniqueId, JSON.stringify(chatSession));
  }
  return new Response(resp['choices'][0]['message']['content'].toString());
}
// 原始数组
const originalArray = [{"role": "user", "content": "hello"}];

// openai格式消息转换函数
function transform(messages) {
  return messages.map(item => {
    // 根据role值进行转换
    const roleMapping = {
      "user": "user",
      "assistant": "model"
    };
    const newRole = roleMapping[item.role] || item.role;
    // 构建新的对象
    return {
      "role": newRole,
      "parts": [{"text": item.content}]
    };
  });
}
//请求gemini服务
async function gemini(requestJson, env) {
  const messages = requestJson.messages;
  const apiURL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key='+env.GEMINI_API_KEY;
  const response = await fetch(apiURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({"contents":transform(messages)})
  });
  if (!response.ok) {
    return new Response(await response.text(), { status: 400});
  }
  const resp = await response.json();

  const chatSession = {
    "model":requestJson.model,
    "request":requestJson.messages,
    "response":resp
  };
  if (env.ChatRecordR2){
    await env.ChatRecordR2.put(requestJson.chatUniqueId, JSON.stringify(chatSession));
  }

  return new Response(resp.candidates[0].content.parts[0].text);
}

function getYearMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; 
  return `${year}${month < 10 ? '0' : ''}${month}`;
}

function getQueryMonth() {
  const currentDate = new Date();
  const currentYearMonth = getYearMonth(currentDate);
  // 设置为上个月的同一天
  currentDate.setMonth(currentDate.getMonth() - 1);
  const previousYearMonth = getYearMonth(currentDate);
  return [
    currentYearMonth,
    previousYearMonth
  ];
}

// session
async function session(request, env) {

  const url = new URL(request.url);
  const chatUniqueId = url.pathname.slice("/session/".length);
  if(chatUniqueId == "all" && !env.ChatRecordR2){
    return new Response('[]', {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  if (env.ChatRecordR2){
    if (chatUniqueId == "all"){
      const querys = getQueryMonth();
      const objects = [];
      for (let index = 0; index < querys.length; index++) {
        const queryOptions = {
          limit: 100,
          prefix: "id-"+querys[index],
        }
        const quertRet = await env.ChatRecordR2.list(queryOptions);
        objects.push(...quertRet.objects);
      }
      var keys = objects.map(item => item.key);
      keys.sort((a, b) => {
        if (a > b) {
          return -1;
        }
        if (a < b) {
          return 1;
        }
        return 0;
      });
      return new Response(JSON.stringify(keys), {
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    //调试时不弹出登录框
    if (url.pathname.startsWith("/helloworld")) {
      return new Response("HelloWorld");
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
      const body = await request.text();
      const requestJson = JSON.parse(body);
      if("geminipro" == requestJson.model){
        return gemini(requestJson, env);
      }
      return openAI(requestJson, env);
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
