import nextPlugin from 'eslint-config-next';

const config = [
  ...nextPlugin,
  {
    ignores: ['dist/', 'node_modules/', '.next/'],
  },
];

export default config;
