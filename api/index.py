from app.main import app

# This is necessary for Vercel serverless function deployment
# It exposes the FastAPI app as a handler
handler = app 