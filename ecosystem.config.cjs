module.exports = {
  apps: [
    {
      name: 'rpa-monitor',
      script: 'npm',
      args: 'run preview',
      cwd: __dirname,
      env: { NODE_ENV: 'production', PORT: 3000 },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 5,
    },
  ],
}
