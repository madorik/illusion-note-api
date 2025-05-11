def handler(event, context):
    """
    A simple AWS Lambda-style function
    """
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json'
        },
        'body': {
            'message': 'Hello Vercel!',
            'path': event.get('path', '')
        }
    } 