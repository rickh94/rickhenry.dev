module.exports = {
  plugins: {
    "tailwindcss/nesting": {},
    tailwindcss: {
      config: "./styles/tailwind.config.js",
    },
    autoprefixer: {},
    ...(process.env.NODE_ENV === "production" ? { cssnano: {} } : {}),
  },
};
