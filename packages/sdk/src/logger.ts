import pino from 'pino';

const level = process.env.LOG_LEVEL ?? 'info';

export const logger = pino({
  level,
  base: { pkg: '@skillforge/sdk' },
  redact: {
    paths: ['privateKey', '*.privateKey', 'config.chain.privateKey', 'config.storage.privateKey'],
    censor: '[REDACTED]',
  },
});
