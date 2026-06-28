// PM2 config — serves the built static SPA (dist/) via Vite preview on :3000.
module.exports = {
  apps: [
    {
      name: 'rpa-monitor',
      script: 'npm',
      args: 'run preview',
      cwd: '/home/user/webapp',
      env: { NODE_ENV: 'production', PORT: 3000 },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
    },
  ],
}
