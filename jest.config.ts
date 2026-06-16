import baseConfig from 'super-configs/jest';
import type { Config } from 'jest';

const config: Config = {
  ...baseConfig,
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
};

export default config;
