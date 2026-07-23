# NewsCred — Intelligent News Credibility Assessment Platform

A mobile application that assesses the credibility of news articles by combining
**live fact-check database verification** with **natural language heuristics**.

## How the analysis works
Each article receives a 0–100 credibility score built from five weighted components:

1. **Linguistic analysis (35%)** — six indicators computed from the text itself:
   source reputation, content depth, evidence citations, sensational language,
   factual consistency phrasing, and clickbait headline patterns.
2. **Fact-check verification (30%)** — claims are extracted from the article and
   checked against the **Google Fact Check Tools API**, a global database of
   published fact-checks from organizations such as PolitiFact, Snopes, AFP and
   Full Fact. A claim rated "False" by a professional fact-checker caps the
   article's maximum score. If the live database is unreachable, the system
   degrades gracefully to local signals and says so in the report.
3. **Author transparency (15%)** — named bylines and organizational affiliation.
4. **Date verification (10%)** — publish-date detection and freshness context.
5. **Image signals (10%)** — URL-based checks for stock photos and AI-tool references
   (clearly labeled as weak signals).

## Features
- Article credibility scoring with verdicts (Credible → Not Credible)
- Live claim verification with links to published fact-checks
- Premium subscription via **Paystack** (card + Mobile Money, GHS) with
  server-side payment verification
- Free tier: 3 analyses with summary reports; Premium: unlimited + full
  forensic breakdown
- JWT authentication with refresh tokens, rate limiting, dark mode

## Tech Stack
**Backend:** Java 17, Spring Boot, PostgreSQL, Spring Security (JWT), Jsoup,
Google Fact Check Tools API, Paystack API
**Mobile:** React Native (Expo), TypeScript, React Navigation, React Native Paper

## Team Members
- Falcohne — Backend Development
- Agyemang-99 — Mobile Services
- imole — Mobile Components and Navigation
- Manuel-Ami — Mobile Screens
- Obour-1 — Configuration Files

## Setup
See `SETUP-SECURITY.md` for environment variables (database, JWT, Paystack,
Google Fact Check API key) and run instructions.
