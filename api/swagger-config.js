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
        url: 'https://your-vercel-domain.vercel.app',
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
    './server.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs; 