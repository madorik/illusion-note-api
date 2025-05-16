// Express 기반 Vercel Serverless API
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const OpenAIService = require('./openai-service');
const path = require('path');

// Initialize Express
const app = express();
// Initialize OpenAIService
const openaiService = new OpenAIService();

// CORS 설정
app.use(cors());
app.use(express.json());

// 정적 파일 제공 설정
app.use(express.static(path.join(__dirname, '../public')));

// 기본 루트 엔드포인트
app.get('/', (req, res) => {
  res.json({ 
    message: 'Illusion Note API - Welcome!',
    endpoints: {
      '/': 'API 정보 (GET)',
      '/health': '상태 확인 (GET)',
      '/api/emotion': '기본 감정 분석 - OpenAI 기반 (POST)',
      '/api/emotion/openai': '향상된 감정 분석 - OpenAI 서비스 기반 (POST)',
      '/api/openai/completion': 'OpenAI 텍스트 생성 (POST)'
    },
    docs: {
      '/emotion-analyzer-test.html': '감정 분석 테스트 페이지'
    }
  });
});

// 상태 체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// OpenAI 감정 분석 엔드포인트 - OpenAIService 사용
app.post('/api/emotion/openai', async (req, res) => {
  try {
    const { text, mood_id = 'neutral', mode = 'chat', response_type = 'comfort', context = '' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // OpenAIService를 사용한 응답 생성
    const result = await openaiService.generateResponse(
      text,
      mode,
      mood_id,
      response_type,
      context
    );
    
    // 응답 반환
    return res.json(result);
  } catch (error) {
    console.error('OpenAI 감정 분석 오류:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 원본 감정 분석 엔드포인트 (하위 호환성 유지)
app.post('/api/emotion', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // API 키 확인
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // API 키가 없으면 기본 응답 반환
      return res.json({ 
        error: 'OpenAI API key not configured',
        emotions: {
          happy: 0.2,
          sad: 0.1,
          angry: 0.1,
          fear: 0.1,
          surprise: 0.1
        },
        source: 'default' 
      });
    }

    // OpenAI API 사용
    try {
      const openai = new OpenAI({ apiKey });
      
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an emotion analyzer. Analyze the text and return emotions with their intensities. Return only JSON with no explanation.'
          },
          {
            role: 'user',
            content: `Analyze the emotional content of this text and return a JSON object with emotions (happy, sad, angry, fear, surprise) and their intensities from 0.0 to 1.0. Text: "${text}"`
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      // 응답 파싱 시도
      try {
        const content = response.choices[0].message.content;
        const parsedContent = JSON.parse(content);
        
        // 감정 값들이 있는지 확인하고 없으면 기본 구조 생성
        const emotions = {
          happy: parsedContent.happy || 0.0,
          sad: parsedContent.sad || 0.0, 
          angry: parsedContent.angry || 0.0,
          fear: parsedContent.fear || 0.0,
          surprise: parsedContent.surprise || 0.0
        };
        
        return res.json({ 
          emotions,
          source: 'openai' 
        });
      } catch (parseError) {
        console.error('OpenAI 응답 파싱 오류:', parseError);
        // 파싱 오류 발생 시 기본 응답 반환
        return res.json({ 
          error: 'Failed to parse OpenAI response',
          emotions: {
            happy: 0.2,
            sad: 0.1,
            angry: 0.1,
            fear: 0.1,
            surprise: 0.1
          },
          source: 'default' 
        });
      }
    } catch (openaiError) {
      console.error('OpenAI API 오류:', openaiError);
      // OpenAI API 오류 발생 시 기본 응답 반환
      return res.json({ 
        error: openaiError.message,
        emotions: {
          happy: 0.2,
          sad: 0.1,
          angry: 0.1,
          fear: 0.1,
          surprise: 0.1
        },
        source: 'default' 
      });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// OpenAI 통합 엔드포인트
app.post('/api/openai/completion', async (req, res) => {
  try {
    const { prompt, temperature = 0.7, max_tokens = 500 } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    try {
      const openai = new OpenAI({ apiKey });
      
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature,
        max_tokens
      });

      return res.json({ 
        text: response.choices[0].message.content,
        usage: response.usage
      });
    } catch (openaiError) {
      console.error('OpenAI API 오류:', openaiError);
      return res.status(500).json({ error: openaiError.message });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = app; 