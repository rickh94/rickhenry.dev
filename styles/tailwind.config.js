const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    "./**/*.njk",
    "./**/*.md",
    "./**/*.css"
  ],
  theme: {
    screens: {
      'xs': '475px',
      ...defaultTheme.screens
    },
    extend: {},
  },
  plugins: [
    require("@tailwindcss/forms"),
  ],
};
