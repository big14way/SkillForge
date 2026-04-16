import chalk from 'chalk';

const EXPLORER = 'https://chainscan-galileo.0g.ai';

export const ui = {
  heading(s: string): void {
    console.log(chalk.bold.cyan(`\n${s}\n${'─'.repeat(s.length)}`));
  },
  ok(s: string): void {
    console.log(chalk.green('✓'), s);
  },
  warn(s: string): void {
    console.log(chalk.yellow('⚠'), s);
  },
  info(s: string): void {
    console.log(chalk.dim('·'), s);
  },
  fatal(s: string): never {
    console.error(chalk.red('✗'), s);
    process.exit(1);
  },
  tx(hash: string, label = 'tx'): void {
    console.log(chalk.dim(`  ${label}:`), chalk.blue(`${EXPLORER}/tx/${hash}`));
  },
  addr(addr: string, label = 'address'): void {
    console.log(chalk.dim(`  ${label}:`), chalk.cyan(`${EXPLORER}/address/${addr}`));
  },
};
