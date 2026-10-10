# Google Gemini Vision API Integration Guide for EcoScan

EcoScan uses Google's **Gemini 3.8 Flash Multimodal Vision** model for real-time AI waste segregation, categorization, and recyclable item identification.

---

## 1. Why Your Gemini API Key Might Not Work

If you are seeing errors or Gemini is not detecting items, here are the most common reasons:

1. **Missing `.env` file (Most Common)**:
   - The app does **not** store API keys in the browser or `localStorage` (for security).
   - Keys must be configured in a `.env` file in the project root (`GEMINI_API_KEY=...`).
   - Without this, the server returns `503: Gemini is not configured`.
2. **Server Not Restarted After Editing `.env`**:
   - Environment variables are loaded on server startup. If you edit `.env` while the dev server is running, restart it (`Ctrl+C` then `npm run dev`).
3. **Dependencies Not Installed (`node_modules`)**:
   - Run `npm install` to ensure `@ai-sdk/google` and server packages are available.
4. **Invalid API Key or Restricted Permissions**:
   - Ensure your key is generated from [Google AI Studio](https://aistudio.google.com/app/apikey).
   - Check that the key is not restricted from calling the Google Generative Language API.
5. **Quota Rate Limits (HTTP 429)**:
   - If quota is exhausted on the free tier, configure a secondary key in `GEMINI_API_KEY_BACKUP`.
6. **Image Size / Format Constraints**:
   - The image sent to Gemini must be a JPEG, PNG, or WebP under 3.5 MB.

---

## 2. How to Add Your Gemini API Key (Step-by-Step)

### Step 1: Create your `.env` file
In the project root folder, copy `.env.example` to create `.env`:
```powershell
Copy-Item .env.example .env
```

### Step 2: Add your API key
Open `.env` and set `GEMINI_API_KEY`:
```env
# Primary Google AI Studio Gemini API Key
GEMINI_API_KEY=AIzaSyYourActualKeyHere

# Model configuration (Gemini 3.8 Flash)
GEMINI_MODEL=gemini-3.8-flash

# Optional: authorized backup key for automatic 429 failover
# GEMINI_API_KEY_BACKUP=AIzaSyYourBackupKeyHere
```

### Step 3: Install dependencies and start the app
```powershell
npm install
npm run dev
```
The application will launch at `http://localhost:3000`.

---

## 3. How to Test Your Gemini Integration

### Method A: Live Waste Scanner UI
1. Navigate to `http://localhost:3000/#/scan`.
2. Click **Start Camera** or click **Browse Photo** to upload a waste image (e.g., plastic bottle, cardboard, can).
3. Click **Capture & Analyse** or let it process.
4. When Gemini responds, the viewfinder shows a **LIVE** badge with labeled bounding boxes and material insights.

### Method B: Developer & API Playground
1. Navigate to `http://localhost:3000/#/developer`.
2. Scroll to the **API Playground** section.
3. Drop an image or browse a file to test model inferences directly and inspect the raw JSON detection output.

### Method C: Health & Backend Verification
To check configured keys and status:
```powershell
curl http://localhost:3000/api/health
```
Returns:
```json
{
  "status": "ok",
  "configuredKeysCount": 1,
  "activeKeyIndex": 1
}
```
