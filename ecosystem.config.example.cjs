module.exports = {
  apps: [
    {
      name: 'loja-backend',
      script: 'dist/main.js',
      cwd: '/var/www/loja-backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,

        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_USERNAME: 'loja_user',
        DB_PASSWORD: 'replace-me',
        DB_DATABASE: 'loja_db',
        TYPEORM_MIGRATIONS_RUN: 'false',

        JWT_SECRET: 'replace-me',
        JWT_EXPIRES_IN: '3600',

        STRIPE_SECRET_KEY: 'replace-me',
        STRIPE_WEBHOOK_SECRET: 'replace-me',

        CHECKOUT_SUCCESS_URL: 'https://loja.juliano340.com/checkout/success',
        CHECKOUT_CANCEL_URL: 'https://loja.juliano340.com/cart',
        CURRENCY: 'brl',
        PENDING_ORDER_TTL_MINUTES: '30',
      },
    },
  ],
};
