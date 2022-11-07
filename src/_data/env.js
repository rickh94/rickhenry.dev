require("dotenv").config();

const testing = {
  formsparkURL: process.env.FORMSPARK_TESTING,
  botpoisonPublicKey: process.env.BOTPOISON_TESTING,
  url: "http://localhost:8080",
};

const production = {
  formsparkURL: process.env.FORMSPARK_PRODUCTION,
  botpoisonPublicKey: process.env.BOTPOISON_PRODUCTION,
  url: "https://rickhenry.dev",
};

module.exports = process.env.ELEVENTY_PRODUCTION ? production : testing;
