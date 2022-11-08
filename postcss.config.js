module.exports = {
  plugins: {
    "tailwindcss/nesting": {},
    tailwindcss: {
      config: "./styles/tailwind.config.js",
    },
    autoprefixer: {},
    cssnano: {
      preset: 'default'
    },
  },
};
