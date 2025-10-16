/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/lib/htlc/**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      }
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/lib/htlc/**/*.ts',
    '!src/lib/htlc/**/*.test.ts',
    '!src/lib/htlc/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
};

module.exports = config;
