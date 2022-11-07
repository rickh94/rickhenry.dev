require("dotenv").config();

const common = {
  url: process.env.URL,
};

const testing = {
  formsparkURL: process.env.FORMSPARK_TESTING,
  botpoisonPublicKey: process.env.BOTPOISON_TESTING,
  ...common,
};

const production = {
  formsparkURL: process.env.FORMSPARK_PRODUCTION,
  botpoisonPublicKey: process.env.BOTPOISON_PRODUCTION,
  ...common,
};

module.exports = process.env.ELEVENTY_PRODUCTION ? production : testing;
