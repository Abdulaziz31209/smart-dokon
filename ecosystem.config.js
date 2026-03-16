/*
DISABLED - Bot migrated to Supabase webhook (serverless, no local intervention needed)

1. cd smart-dokon/smart-bi-os
2. npx supabase functions deploy telegram-webhook
3. Set env vars in Supabase Edge Function settings:
   - TELEGRAM_BOT_TOKEN
   - SUPABASE_URL  
   - SUPABASE_SERVICE_ROLE_KEY
4. Set Telegram webhook: https://YOUR_PROJECT.supabase.co/functions/v1/telegram-webhook

Original PM2 polling config (DISABLED):
*/

require('dotenv').config({ path: 'c:/Users/W.One/Desktop/smart-dokon/smart-bi-os/.env' });

/*
module.exports = {
  apps : [{
    name: "SmartDokonSupport_bot",
    script: "node",
    args: "c:/Users/W.One/Desktop/smart-dokon/smart-bi-os/node_modules/tsx/dist/cli.mjs c:/Users/W.One/Desktop/smart-dokon/smart-bi-os/bot.ts",
    cwd: "c:/Users/W.One/Desktop/smart-dokon/smart-bi-os",
    interpreter: "none",
    env: {
      NODE_ENV: "production",
      BOT_TOKEN: process.env.BOT_TOKEN,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_KEY: process.env.SUPABASE_KEY
    },
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: "10s"
  }]
};
*/
