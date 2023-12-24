# cloudflare-ai-worker
使用cloudflare+openai/gemini提供的API实现一个轻量的，随时随地可访问的ai web，并且支持openai代理。

## 说明
需要创建一个cloudflare的Worker，复制代码库的两个文件到Worker中，然后配置两个环境变量。
* OPENAI_KEY 填写openai的API key
* GEMINI_API_KEY 填写gemini的API key
* TOKEN 填写你访问服务是校验的"账号:密码"转BASE64后的编码
  * 例如：账号admin，密码123456，使用“admin:123456”通过base64编码得到的值是“YWRtaW46MTIzNDU2”
* 【可选】R2 存储桶绑定变量ChatRecordR2（需要提前创建存储桶）
  * 绑定R2后可以存储历史会话   
![image](https://github.com/realqiyan/cloudflare-openai-web/assets/4379546/63400014-9f75-4709-a143-77d8be0e8c46)


### worker
#### 创建worker
![image](https://github.com/realqiyan/cloudflare-chatgptweb/assets/4379546/f996bd83-29e5-405c-b9c3-5e5773ada15e)

#### 创建配置
![image](https://github.com/realqiyan/cloudflare-chatgptweb/assets/4379546/cb899af1-31f2-427b-b6b1-1b78c9a2b480)

#### 复制代码
![image](https://github.com/realqiyan/cloudflare-chatgptweb/assets/4379546/84827c21-95fd-4223-a9b0-6751b85180b6)
