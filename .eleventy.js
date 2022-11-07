const htmlmin = require("html-minifier");
const markdownIt = require("markdown-it");
const mdFigcaption = require("markdown-it-image-figures");
const { EleventyRenderPlugin } = require("@11ty/eleventy");
const EleventyNavigationPlugin = require("@11ty/eleventy-navigation");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const Image = require('@11ty/eleventy-img');
const { compress } = require('eleventy-plugin-compress');

function imageShortcode(src, cls, alt, sizes) {
  let options = {
    widths: [300, 600],
    formats: ['avif', 'webp', 'png', 'jpeg'],
    urlPath: "/assets/img",
    outputDir: "_site/assets/img/"
  };

  // generate images, while this is async we don’t wait
  Image(src, options);

  let imageAttributes = {
    class: cls,
    alt,
    sizes,
    loading: "lazy",
    decoding: "async",
  };
  // get metadata even the images are not fully generated
  let metadata = Image.statsByDimensionsSync(src, 600, 600, options);
  return Image.generateHTML(metadata, imageAttributes);
}


const now = String(Date.now());

const SITE_TITLE = "Rick Henry Development";

let figoptions = {
  figcaption: true,
};

const mdLib = markdownIt({html: true}).use(mdFigcaption, figoptions);

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(EleventyRenderPlugin);
  eleventyConfig.addPlugin(EleventyNavigationPlugin);
  eleventyConfig.addPlugin(syntaxHighlight);

  eleventyConfig.setUseGitIgnore(false);

  eleventyConfig.addWatchTarget("./styles/tailwind.config.js");
  eleventyConfig.addWatchTarget("./styles/tailwind.pcss");

  eleventyConfig.addPassthroughCopy({ "./_tmp/style.css": "./style.css" });
  eleventyConfig.addPassthroughCopy("./assets");

  eleventyConfig.addShortcode("version", function () {
    return now;
  });

  eleventyConfig.addTransform("htmlmin", function (content, outputPath) {
    if (
      process.env.ELEVENTY_PRODUCTION &&
      outputPath &&
      outputPath.endsWith(".html")
    ) {
      return htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
      });
    }
    return content;
  });

  eleventyConfig.addPassthroughCopy({
    "./node_modules/alpinejs/dist/cdn.min.js": "./js/alpine.js",
  });

  eleventyConfig.addNunjucksFilter("niceDate", (value) => {
    return new Date(value).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric" });
  });

  eleventyConfig.addFilter("sortByIndex", (value) => {
    value.sort((a, b) => a.data.index - b.data.index);
    return value;
  });

  eleventyConfig.setLibrary("md", mdLib);

  eleventyConfig.addFilter("appendSiteTitle", (value) => {
    if (value.includes(SITE_TITLE)) {
      return value;
    } else {
      return `${value} | ${SITE_TITLE}`;
    }
  });

  eleventyConfig.addNunjucksShortcode("image", imageShortcode);
  eleventyConfig.addLiquidShortcode("image", imageShortcode);
  eleventyConfig.addJavaScriptFunction("image", imageShortcode);

  // eleventyConfig.addPlugin(compress, {
  //   enabled: process.env.ELEVENTY_PRODUCTION,
  //   algorithm: ['brotli', 'gzip'],
  // });

  return {
    dir: {
      input: "src",
    },
  };
};

