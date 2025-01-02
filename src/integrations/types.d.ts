declare module "lite-youtube-embed" {
  declare class LiteYTEmbed extends HTMLElement {
    async getYTPlayer(): Promise<YT.Player | undefined>;
  }

  declare global {
    interface HTMLElementTagNameMap {
      "lite-youtube": LiteYTEmbed;
    }
  }
}
