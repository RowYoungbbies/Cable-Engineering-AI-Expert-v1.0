const https = require('https');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const { userInput } = JSON.parse(body);
      if (!userInput || userInput.trim() === '') {
        return res.status(400).json({ error: '请输入内容' });
      }
      handleRequest(userInput, res);
    } catch (e) {
      return res.status(400).json({ error: '无效请求格式' });
    }
  });
};

function handleRequest(userInput, res) {
  const SYSTEM_PROMPT = `你是电缆专家，按【结论】【结构解析】【对应国标】【判断依据】【风险提示】格式输出，禁止科普，检测冲突。`;

  const requestData = JSON.stringify({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userInput }
    ],
    temperature: 0.1,
    max_tokens: 2500
  });

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return res.status(500).json({ error: '未配置 API 密钥' });

  const options = {
    hostname: 'api.deepseek.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Content-Length': Buffer.byteLength(requestData)
    }
  };

  const request = https.request(options, (response) => {
    let data = '';
    response.on('data', chunk => { data += chunk; });
    response.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.choices && json.choices[0] && json.choices[0].message) {
          return res.status(200).json({ success: true, result: json.choices[0].message.content });
        } else {
          return res.status(500).json({ error: json.error?.message || 'AI 返回异常' });
        }
      } catch (e) {
        return res.status(500).json({ error: '解析 AI 响应失败' });
      }
    });
  });

  request.on('error', (e) => {
    return res.status(500).json({ error: '网络请求失败: ' + e.message });
  });

  request.write(requestData);
  request.end();
}
