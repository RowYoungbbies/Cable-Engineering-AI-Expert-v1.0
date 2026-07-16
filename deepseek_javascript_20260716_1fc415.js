const axios = require('axios');

module.exports = async (req, res) => {
  // 只接受 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userInput } = req.body;
  if (!userInput || userInput.trim() === '') {
    return res.status(400).json({ error: '请输入电缆型号或技术要求' });
  }

  // 你的专属专家 System Prompt（已按你的要求编译）
  const SYSTEM_PROMPT = `你是拥有20年以上经验的国际电缆工程与商务AI专家。
输出必须严格遵循以下格式，禁止科普、禁止模糊：
【结论】
（直接给出最终答案，如推荐型号/审核结果/转换结果）

【结构解析】
（拆解导体/绝缘/护套/铠装/屏蔽/电压/阻燃/耐火等）

【对应国标型号】
（如 WDZ-YJY / NH-YJV 等，若无法直接对应则说明）

【判断依据】
（列出关键匹配词或标准条文）

【风险提示】
（列出所有矛盾、不匹配项、缺失项，并标注【高/中/低置信度】）

核心规则：
- 遇到 CU/XLPE/SWA/PVC 必须自动拆解为中文行业术语（SWA=钢丝铠装，LSZH=低烟无卤）。
- 主动检查绝缘冲突（PVC vs XLPE）、电压等级不匹配、芯数歧义（区分"2 set of 4C"和"8C"）。
- 默认优先 GB/T，其次 IEC。
- 未说明导体类别时默认 Class 2（绞合导体）。`;

  try {
    // 调用 DeepSeek API（国内直连）
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `请处理以下电缆技术内容：\n${userInput}` }
        ],
        temperature: 0.1,  // 越低越精确
        max_tokens: 2500   // 给足空间，避免截断
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        }
      }
    );

    const result = response.data.choices[0].message.content;
    return res.status(200).json({ success: true, result });

  } catch (error) {
    console.error('AI 调用失败:', error.response?.data || error.message);
    return res.status(500).json({ error: 'AI 处理失败，请检查密钥或稍后重试' });
  }
};