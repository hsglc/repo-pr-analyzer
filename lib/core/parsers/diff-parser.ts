import parseDiff from "parse-diff";
import type { ParsedFile, ParsedChunk, ParsedChange } from "../types";

export class DiffParser {
  parse(rawDiff: string): ParsedFile[] {
    const files = parseDiff(rawDiff);

    return files.map((file) => ({
      path: file.to || file.from || "unknown",
      oldPath: file.from !== file.to ? file.from || undefined : undefined,
      additions: file.additions,
      deletions: file.deletions,
      status: this.getFileStatus(file),
      chunks: file.chunks.map((chunk) => this.parseChunk(chunk)),
    }));
  }

  private getFileStatus(file: parseDiff.File): ParsedFile["status"] {
    if (file.new) return "added";
    if (file.deleted) return "deleted";
    if (file.from !== file.to) return "renamed";
    return "modified";
  }

  private parseChunk(chunk: parseDiff.Chunk): ParsedChunk {
    return {
      content: chunk.content,
      oldStart: chunk.oldStart,
      newStart: chunk.newStart,
      changes: chunk.changes.map((change) => this.parseChange(change)),
    };
  }

  private parseChange(change: parseDiff.Change): ParsedChange {
    return {
      type:
        change.type === "add" ? "add" : change.type === "del" ? "del" : "normal",
      content: change.content,
      lineNumber:
        change.type === "normal"
          ? (change as parseDiff.NormalChange).ln1
          : change.type === "add"
            ? (change as parseDiff.AddChange).ln
            : (change as parseDiff.DeleteChange).ln,
    };
  }
}
