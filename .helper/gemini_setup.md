# Gemini API Setup Guide

This guide walks you through setting up Google's Gemini API for the chat feature.

---

## 1. Get a Gemini API Key

### Option A: Google AI Studio (Recommended for Development)

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click **"Get API Key"** in the top right
4. Click **"Create API Key"**
5. Choose an existing Google Cloud project or create a new one
6. Copy your API key

### Option B: Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services > Library**
4. Search for "Generative Language API" and enable it
5. Go to **APIs & Services > Credentials**
6. Click **"Create Credentials" > "API Key"**
7. Copy your API key

After copying your Gemini API key, add it to your project's `.env` file using the following variable name:

```
GEMINI_API_KEY=your_api_key_here
```

Make sure the `.env` file is located in your project root. This environment variable will be picked up by the backend automatically.

After updating the `.env` file, restart your development server or Docker containers to apply the change.



---

## 2. Billing Setup

### Free Tier Limits

Gemini offers a generous free tier:
- **Gemini 1.5 Flash**: 15 RPM, 1M TPM, 1,500 RPD
- **Gemini 1.5 Pro**: 2 RPM, 32K TPM, 50 RPD

(RPM = requests per minute, TPM = tokens per minute, RPD = requests per day)

### Enable Paid Billing (When Needed)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **Billing**
3. Click **"Link a billing account"** or create one
4. Add a payment method
5. Link the billing account to your project

### Pricing (as of Dec 2024)

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| Gemini 1.5 Flash | $0.075 | $0.30 |
| Gemini 1.5 Pro | $1.25 | $5.00 |

---

## 3. Add API Key to Project

Create a `.env` file in the project root (this file is gitignored):

```bash
GEMINI_API_KEY=your_api_key_here
```

The Docker Compose file will automatically load this environment variable.

---

## 4. Test Your Setup

Start the services:

```bash
./dev_build.sh
./dev_start.sh
```

Open the app at `http://localhost:3000` and click the chat button. Try asking:
- "Hello, who are you?"
- "What time is it?" (tests the tool calling)

---

## 5. Troubleshooting

### "API key not valid"
- Verify the key is correctly copied (no extra spaces)
- Make sure the Generative Language API is enabled
- Check if the key has any restrictions that block your requests

### "Quota exceeded"
- You've hit the free tier limits
- Wait for the rate limit to reset, or enable billing

### "Permission denied"
- The API might not be enabled for your project
- Go to Cloud Console > APIs & Services > Library > Enable "Generative Language API"

---

## 6. Security Notes

- **Never commit your API key** to version control
- Use environment variables for all secrets
- Rotate keys periodically in production
- Set up API key restrictions in Cloud Console for production use

