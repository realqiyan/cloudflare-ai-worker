# cloudflare-chatgptweb
使用cloudflare+openai提供的API实现一个轻量的，随时随地可访问的chatgptweb。

## 说明
需要创建一个cloudflare的Worker，复制代码库的两个文件到Worker中，然后配置两个环境变量。
* OPENAI_KEY 填写openai的token
* TOKEN 填写你访问服务是校验的"账号:密码"转BASE64后的编码
