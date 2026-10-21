/// <reference types="bun" />

declare module "*.md" {
  const content: string;
  export default content;
}
