module.exports = {
  apps: [
    {
      name: 'login-ms-dev',
      script: 'dist/main.js',
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
