module.exports = {
  apps: [
    {
      name: 'login-ms',
      script: 'dist/main.js',
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
