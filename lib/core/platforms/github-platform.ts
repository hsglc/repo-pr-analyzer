import { Octokit } from "@octokit/rest";

export class GitHubPlatform {
  private octokit: Octokit;

  constructor(
    token: string,
    private owner: string,
    private repo: string
  ) {
    this.octokit = new Octokit({ auth: token });
  }

  async getDiff(prNumber: number): Promise<string> {
    const { data } = await this.octokit.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
      mediaType: { format: "diff" },
    });

    return data as unknown as string;
  }

  async getPRTitle(prNumber: number): Promise<string> {
    const { data } = await this.octokit.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });

    return data.title;
  }

  async getPRInfo(prNumber: number): Promise<{ title: string; headSha: string }> {
    const { data } = await this.octokit.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });
    return { title: data.title, headSha: data.head.sha };
  }

  async getRepoTree(): Promise<string[]> {
    const { data: repoData } = await this.octokit.repos.get({
      owner: this.owner,
      repo: this.repo,
    });
    const defaultBranch = repoData.default_branch;

    const { data } = await this.octokit.git.getTree({
      owner: this.owner,
      repo: this.repo,
      tree_sha: defaultBranch,
      recursive: "1",
    });

    return data.tree
      .filter((item) => item.type === "blob" && item.path)
      .map((item) => item.path!);
  }

  async getPRHeadSha(prNumber: number): Promise<string> {
    const { data } = await this.octokit.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });
    return data.head.sha;
  }

  async createReview(
    prNumber: number,
    body: string,
    comments: { path: string; line?: number; body: string }[]
  ): Promise<void> {
    const reviewComments = comments
      .filter((c) => c.line)
      .map((c) => ({
        path: c.path,
        line: c.line!,
        body: c.body,
      }));

    await this.octokit.pulls.createReview({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
      body,
      event: "COMMENT" as const,
      comments: reviewComments.length > 0 ? reviewComments : undefined,
    });
  }

  async upsertComment(
    prNumber: number,
    body: string,
    marker: string
  ): Promise<void> {
    const { data: comments } = await this.octokit.issues.listComments({
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
    });

    const existing = comments.find((c) => c.body?.includes(marker));

    if (existing) {
      await this.octokit.issues.updateComment({
        owner: this.owner,
        repo: this.repo,
        comment_id: existing.id,
        body,
      });
    } else {
      await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber,
        body,
      });
    }
  }
}
