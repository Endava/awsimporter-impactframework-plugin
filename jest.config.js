/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/src/**/__tests__/**/*.ts?(x)',
    '**/src/?(*.)+(spec|test).ts?(x)',
  ],
  testPathIgnorePatterns: ['<rootDir>/dist/'],
};
