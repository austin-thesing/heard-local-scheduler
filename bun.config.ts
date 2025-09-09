import type { BunPlugin } from 'bun';

// TypeScript plugin for Bun
const typescriptPlugin: BunPlugin = {
  name: 'typescript',
  setup(build) {
    build.onLoad({ filter: /\.ts$/ }, async (args) => {
      const text = await Bun.file(args.path).text();
      
      // For now, just return the TypeScript as-is
      // In a real setup, you'd use the TypeScript compiler
      return {
        contents: text,
        loader: 'js',
      };
    });
  },
};

export default {
  plugins: [typescriptPlugin],
};