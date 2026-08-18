const { spawn } = require('node:child_process');
const path = require('node:path');

const fallbackDatabaseUrl =
  'postgresql://totalagenda_app:totalagenda_dev@localhost:5432/totalagenda_dev?schema=public';
const prismaCommand = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
const prismaArgs = ['studio', '--schema', path.join('prisma', 'schema.prisma')];

const child = spawn(prismaCommand, prismaArgs, {
  cwd: path.resolve(__dirname, '..'),
  env: {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL || fallbackDatabaseUrl,
  },
  stdio: 'inherit',
  shell: false,
});

child.on('error', (error) => {
  console.error(
    'Não foi possível iniciar o Prisma. Execute `pnpm install` na raiz do monorepo e tente novamente.',
  );
  console.error(error.message);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  }
  process.exit(code ?? 1);
});
