/** A word with its place in the stream, or the space after it (`index` null). */
export interface StreamToken {
  text: string;
  index: number | null;
}
