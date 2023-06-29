{ pkgs, ... }:

{
  # https://devenv.sh/basics/
  env.GREET = "devenv";

  # https://devenv.sh/packages/
  packages = [
    pkgs.git
    pkgs.nodejs
    pkgs.nodePackages.pnpm
    pkgs.netlify-cli
  ];

  # https://devenv.sh/languages/
  # languages.nix.enable = true;
  languages = {
    javascript = {
      enable = true;
      package = pkgs.nodejs;
    };
  };

  # https://devenv.sh/pre-commit-hooks/
  # pre-commit.hooks.shellcheck.enable = true;

  # https://devenv.sh/processes/
  # processes.ping.exec = "ping example.com";

  # See full reference at https://devenv.sh/reference/options/
  scripts.clean.exec = "rm -rf _site _tmp";
  scripts.dev.exec = "pnpm start";
  scripts.build.exec = "rm -rf _site _tmp; pnpm build";
  scripts.draft.exec = "rm -rf _site _tmp; pnpm build; netlify deploy";
  scripts.publish.exec = "rm -rf _site _tmp; pnpm build; netlify deploy --prod";
}
