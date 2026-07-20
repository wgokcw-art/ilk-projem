module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '\\.(css|scss|sass)$': 'identity-obj-proxy'
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/']
};
