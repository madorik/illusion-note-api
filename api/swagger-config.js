const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Illusion Note API',
      version: '1.0.0',
      description: `
        Illusion Note API with Google OAuth authentication and token-based authorization.
        
        ## Authentication
        This API supports two authentication methods:
        1. **Session-based authentication** (traditional web apps)
        2. **Token-based authentication** (mobile apps, SPAs)
        
        ## Token Authentication Flow
        1. Get Google ID Token from your client app
        2. Send ID Token to \`/api/token-auth/google-login\`
        3. Receive Access Token and Refresh Token
        4. Use Access Token in Authorization header: \`Bearer <token>\`
        5. Refresh tokens when needed using \`/api/token-auth/refresh\`
        
        ## Security
        - Access tokens expire in 1 hour
        - Refresh tokens expire in 7 days
        - All tokens are properly validated and can be revoked
      `,
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://illusion-note-api.vercel.app',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Access Token obtained from Google login'
        },
        SessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session-based authentication cookie'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User unique identifier'
            },
            name: {
              type: 'string',
              description: 'User full name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            picture: {
              type: 'string',
              format: 'uri',
              description: 'User profile picture URL'
            },
            provider: {
              type: 'string',
              enum: ['google'],
              description: 'Authentication provider'
            },
            provider_id: {
              type: 'string',
              description: 'Provider-specific user ID'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            },
            last_login: {
              type: 'string',
              format: 'date-time',
              description: 'Last login timestamp'
            }
          }
        },
        TokenResponse: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              description: 'JWT access token (expires in 1 hour)'
            },
            refreshToken: {
              type: 'string',
              description: 'Refresh token (expires in 7 days)'
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            code: {
              type: 'string',
              description: 'Error code'
            },
            details: {
              type: 'string',
              description: 'Additional error details'
            }
          }
        },
        GoogleLoginRequest: {
          type: 'object',
          required: ['idToken'],
          properties: {
            idToken: {
              type: 'string',
              description: 'Google ID Token obtained from Google Sign-In'
            }
          }
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
              description: 'Valid refresh token'
            }
          }
        },
        LogoutRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
              description: 'Refresh token to revoke'
            }
          }
        },
        EmotionAnalysisRequest: {
          type: 'object',
          required: ['text'],
          properties: {
            text: {
              type: 'string',
              description: '감정 분석할 텍스트',
              example: '부장님이 나한테 일 잘한다고 칭찬해줬어.'
            },
            mood_id: {
              type: 'string',
              description: '기분 ID (선택사항)',
              example: ''
            },
            mode: {
              type: 'string',
              enum: ['chat', 'analysis'],
              default: 'chat',
              description: '분석 모드'
            },
            response_type: {
              type: 'string',
              enum: ['comfort', 'advice', 'celebration', 'empathy'],
              default: 'comfort',
              description: '응답 유형'
            },
            context: {
              type: 'string',
              description: '추가 컨텍스트 (선택사항)',
              example: ''
            }
          }
        },
        EmotionAnalysisResponse: {
          type: 'object',
          properties: {
            emotion: {
              type: 'string',
              description: '분석된 감정',
              example: '기쁨'
            },
            response: {
              type: 'string',
              description: 'AI 응답 메시지',
              example: '정말 좋은 소식이네요! 부장님의 칭찬을 받으셨다니 기분이 좋으실 것 같아요.'
            },
            analyze_text: {
              type: 'string',
              description: '감정 분석 상세 내용',
              example: '긍정적인 피드백을 받은 상황으로 기쁨과 성취감이 느껴집니다.'
            },
            summary: {
              type: 'string',
              description: '요약',
              example: '직장에서 긍정적인 피드백을 받은 기쁜 순간'
            },
            title: {
              type: 'string',
              description: '제목',
              example: '부장님의 칭찬'
            }
          }
        },
        EmotionRecord: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: '기록 ID'
            },
            user_id: {
              type: 'string',
              description: '사용자 ID'
            },
            text: {
              type: 'string',
              description: '원본 텍스트'
            },
            emotion: {
              type: 'string',
              description: '분석된 감정'
            },
            response: {
              type: 'string',
              description: 'AI 응답'
            },
            title: {
              type: 'string',
              description: '제목'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: '생성 시간'
            }
          }
        },
        MonthlyEmotionStats: {
          type: 'object',
          properties: {
            yearMonth: {
              type: 'string',
              description: '년월 (YYYY-MM)',
              example: '2024-01'
            },
            totalCount: {
              type: 'integer',
              description: '총 기록 수'
            },
            emotionCounts: {
              type: 'object',
              description: '감정별 카운트',
              additionalProperties: {
                type: 'integer'
              },
              example: {
                '기쁨': 15,
                '슬픔': 5,
                '화남': 3
              }
            },
            dominantEmotion: {
              type: 'string',
              description: '가장 많은 감정',
              example: '기쁨'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Token Authentication',
        description: 'Token-based authentication endpoints for mobile apps and SPAs'
      },
      {
        name: 'Session Authentication',
        description: 'Traditional session-based authentication endpoints'
      },
      {
        name: 'Emotion Analysis',
        description: 'AI-powered emotion analysis and response generation'
      },
      {
        name: 'User Profile',
        description: 'User profile and information endpoints'
      },
      {
        name: 'Notes',
        description: 'Note management endpoints'
      },
      {
        name: 'Health',
        description: 'API health check endpoints'
      }
    ]
  },
  apis: [
    './api/token-auth-routes.js',
    './api/auth-routes.js',
    './api/notes-routes.js',
    './api/index.js',
    './server.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs; 