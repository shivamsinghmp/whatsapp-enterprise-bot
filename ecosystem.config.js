module.exports = {
  apps: [
    {
      name: 'wa-bot',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/whatsapp-enterprise-bot',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
