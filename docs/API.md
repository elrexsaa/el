# API Documentation

## Base URL

https://your-domain.vercel.app/api

## Authentication Endpoints

### POST /api/auth/register
Register user baru.

**Body:**
```json
{
  "nama": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```
Response:
{
  "message": "Registrasi berhasil! Silakan login.",
  "user": {
    "id": "user_id",
    "nama": "John Doe",
    "email": "john@example.com"
  }
}
