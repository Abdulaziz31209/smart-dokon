# Telegram Botni Supabase ga ko'chirish - TODO

## [x] 1. Migrate webhook logic ✅\nUpdated supabase/functions/telegram-webhook/index.ts - now handles both `/start` (generate OTP) and `/start<code>` (verify code).

## [ ] 2. Disable local polling bot
- Comment ecosystem.config.js
- Add note to start-bot.bat

## [ ] 3. Deploy Supabase function
Run: `npx supabase functions deploy telegram-webhook`

## [ ] 4. Configure Supabase Edge Function env vars
Supabase Dashboard > Edge Functions > telegram-webhook > Settings:
- TELEGRAM_BOT_TOKEN=your_bot_token
- SUPABASE_URL=your_project_url
- SUPABASE_SERVICE_ROLE_KEY=your_service_role

## [ ] 5. Set Telegram webhook
`https://YOUR_PROJECT.supabase.co/functions/v1/telegram-webhook`

## [ ] 6. Test
- Send /start to bot
- Generate OTP on signup page, open link
- Verify no local server needed

## [ ] 7. Cleanup
Stop PM2, remove local bot if not needed.

Progress: Starting step 1...
