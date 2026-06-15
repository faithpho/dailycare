# 🌅 DailyCare — AI Elder Care Daily Companion

> Built at Agnes AI Hackathon @ SMU · June 2026

DailyCare is an AI-powered daily companion for elderly users across Singapore and Southeast Asia. It delivers personalised morning greetings in their dialect, medication reminders, health-aware food guidance, water tracking, and sends a daily video summary to family — all powered by Agnes AI.

---

## 🤖 Agnes AI Models Used

| Feature | Model |
|---|---|
| Morning greeting in dialect (Hokkien, Cantonese, Malay, Tamil...) | `agnes-2.0-flash` |
| Context-aware AI health chatbot | `agnes-2.0-flash` |
| Medication visual guide image | `agnes-image-2.1-flash` |
| Daily family update video | `agnes-video-v2.0` |

---

## 🚀 How to Run

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/dailycare.git
cd dailycare
```

### 2. Set up your Agnes AI API key
```bash
cp .env.example .env
# Open .env and paste your key from https://platform.agnes-ai.com
```

Or set it directly:
```bash
export AGNES_API_KEY="your_key_here"
```

### 3. Start the server
```bash
python3 files/server.py
```

### 4. Open the app
```
http://localhost:8080/index.html
```

---

## 📁 Project Structure

```
dailycare/
├── files/
│   ├── index.html       # Main app UI
│   ├── script.js        # All Agnes AI API calls + app logic
│   ├── styles.css       # Elderly-friendly warm UI
│   └── server.py        # Local server + video generation proxy
├── agnes-free-model-skills/
│   ├── agnes-free-text/
│   ├── agnes-free-image/
│   └── agnes-free-video/   # Agnes video generation scripts
├── .env.example         # API key template (safe to commit)
├── .gitignore
└── README.md
```

---

## ✨ Features

- **21 languages & dialects** — Singlish, Hokkien, Cantonese, Teochew, Malay, Tamil, Vietnamese, Thai, Tagalog, Hindi and more
- **Multiple health conditions** — personalised food advice for Hypertension, Diabetes, Heart Disease, Arthritis and more
- **Water intake tracker** — visual cup tracker with AI awareness
- **Medication tracker** — mark taken / undo, with visual reminders
- **Steps goal** — editable step count and custom daily goal
- **AI chatbot** — knows your medications, water, conditions in real time
- **WhatsApp integration** — send daily health update directly to family
- **Daily video summary** — Agnes AI generates a personalised video each day
- **Family management** — add family members with WhatsApp numbers
- **Language switching** — change dialect anytime from Profile tab

---

## 👥 Team

Built with ❤️ using Agnes AI text, image, and video APIs.
