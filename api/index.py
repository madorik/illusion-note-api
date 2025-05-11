def handler(request, context):
    """
    Simple Vercel serverless function handler
    """
    path = request.get("path", "")
    
    # Return different responses based on the path
    if path == "/health":
        return {
            "status": 200,
            "body": {"status": "healthy"}
        }
    
    # Default response for root path
    return {
        "status": 200,
        "body": {"message": "Illusion Note API - Simple Version"}
    } 