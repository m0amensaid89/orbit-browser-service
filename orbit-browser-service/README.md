# Orbit Browser Service

A scalable, containerized browser automation service powered by Playwright and Express. This service provides a REST API to execute browser automation tasks, navigate to URLs, interact with web pages, and capture screenshots or logs in real-time.

## Features
- **Headless Browser Automation:** Built on top of Microsoft Playwright.
- **RESTful API:** Send tasks and steps via HTTP POST requests to the `/execute` endpoint.
- **Step-by-Step Execution:** Supports actions like `goto`, `click`, `type`, `wait`, and `screenshot`.
- **Dockerized:** Fully containerized using the official Playwright Docker image, ready for deployment.
- **Security:** Authenticated endpoint via `x-api-secret` header.

## Local Setup

### Prerequisites
- Node.js (v18 or higher)
- Docker (optional, for containerized local testing)

### Installation
1. Clone the repository and navigate to the project folder:
   ```bash
   git clone https://github.com/m0amensaid89/orbit-browser-service.git
   cd orbit-browser-service
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment variables example file:
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your desired `BROWSER_SERVICE_SECRET`.
4. Run the development server:
   ```bash
   npm run dev
   ```

## API Usage

### Health Check
**GET** `/health`
Returns the status of the service.

### Execute Task
**POST** `/execute`
Headers:
- `Content-Type: application/json`
- `x-api-secret: orbit-secret-change-this` (or your configured secret)

**Example Request Payload:**
```json
{
  "task": "Search Wikipedia",
  "url": "https://www.wikipedia.org",
  "steps": [
    {
      "action": "type",
      "selector": "input#searchInput",
      "value": "Playwright"
    },
    {
      "action": "click",
      "selector": "button[type='submit']"
    },
    {
      "action": "wait",
      "ms": 2000
    }
  ]
}
```

**Example Response:**
```json
{
  "success": true,
  "task": "Search Wikipedia",
  "finalUrl": "https://en.wikipedia.org/wiki/Playwright",
  "finalTitle": "Playwright - Wikipedia",
  "screenshots": ["<base64_encoded_string_1>", "<base64_encoded_string_2>"],
  "log": [
    "Navigating to https://www.wikipedia.org",
    "Loaded: Wikipedia",
    "Typed \"Playwright\" into input#searchInput",
    "Clicked: button[type='submit']",
    "Waited 2000ms"
  ],
  "screenshotCount": 2
}
```

## Deployment

### Railway Deployment Instructions
1. Connect Railway to your GitHub repo: `orbit-browser-service`
2. Railway will auto-detect the `Dockerfile` in the repository.
3. Set the environment variable in Railway: `BROWSER_SERVICE_SECRET=your-secret-here`
4. Deploy the application. Railway will provision a public URL for your service.
5. Set that URL as `BROWSER_SERVICE_URL` in the **Orbit of Khemet** Vercel environment variables.
