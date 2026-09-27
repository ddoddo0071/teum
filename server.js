// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const PDFDocument = require('pdfkit');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. 무료 간단 사주 API (OpenAI 연동)
app.post('/api/saju/free', async (req, res) => {
  const { name, birthDate, birthTime, gender } = req.body;

  try {
    const prompt = `사용자 정보: 이름(${name}), 생년월일(${birthDate}), 태어난시간(${birthTime}), 성별(${gender}).
이 사람의 사주를 바탕으로 핵심만 요약해서 간결하게 알려주세요:
1. 타고난 오행 기운 (목, 화, 토, 금, 수 비율 및 특성)
2. 성격과 성향 3가지 포인트
3. 오늘의 한 줄 운세
답변은 읽기 편하도록 요약된 JSON 형식({ ohaeng: "", personality: [], todayFortune: "" })으로 작성해주세요.`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: '당신은 30년 경력의 명리학 사주 전문가입니다.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = JSON.parse(response.data.choices[0].message.content);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '사주 분석 중 오류가 발생했습니다.' });
  }
});

// 2. 유료 상세 사주 PDF 생성 & 다운로드 API
app.post('/api/saju/premium-pdf', async (req, res) => {
  const { name, birthDate, birthTime, gender, paymentKey, orderId, amount, type } = req.body;

  try {
    // [포트원/토스페이먼츠 결제 검증 로직] - 테스트 모드에서는 생략 가능
    // 실제 운영 시 PG사 승인 API 호출 필요

    // OpenAI 심층 분석 요청
    const premiumPrompt = `사용자 정보: 이름(${name}), 생년월일(${birthDate}), 태어난시간(${birthTime}), 성별(${gender}).
요청 리포트 타입: ${type} (상세 사주 리포트 또는 궁합 분석)

다음 항목을 포함하여 1000자 이상의 매우 상세하고 가치 있는 사주 리포트를 작성해 주세요:
1. 종합 총운 및 타고난 격국
2. 재물운 & 사업/직업운 (상세 가이드)
3. 연애/결혼운 및 귀인운
4. 2026년~2027년 월별 운세 흐름
5. 행운을 가져다주는 컬러, 숫자, 방위, 조언`;

    const aiRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: '당신은 대한민국 최고 명리학 사주가입니다.' },
          { role: 'user', content: premiumPrompt }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const reportText = aiRes.data.choices[0].message.content;

    // PDF 생성
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="saju_report_${name}.pdf"`);

    doc.pipe(res);

    // PDF 내용 구성
    doc.fontSize(22).text(`[천기누설] ${name}님의 프리미엄 사주 리포트`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`생년월일: ${birthDate} (${birthTime}) | 성별: ${gender}`);
    doc.moveDown();
    doc.text('--------------------------------------------------');
    doc.moveDown();
    doc.fontSize(11).text(reportText, { lineGap: 6 });

    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'PDF 생성 중 오류가 발생했습니다.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
