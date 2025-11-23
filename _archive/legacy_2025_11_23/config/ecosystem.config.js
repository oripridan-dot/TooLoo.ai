module.exports = {
  apps: [
    {
      name: 'tooloo-api',
      script: 'dist/server.js',
      cwd: './packages/api',
      instances: 1,
      exec_mode: 'cluster',
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
    }
  ]
}