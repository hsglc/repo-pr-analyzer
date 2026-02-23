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

  async getRepoDetails(): Promise<{
    stars: number;
    forks: number;
    openIssues: number;
    watchers: number;
    defaultBranch: string;
    topics: string[];
  }> {
    const { data } = await this.octokit.repos.get({
      owner: this.owner,
      repo: this.repo,
    });

    return {
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      watchers: data.subscribers_count,
      defaultBranch: data.default_branch,
      topics: data.topics || [],
    };
  }

  async getPRDetails(prNumber: number): Promise<{
    title: string;
    body: string | null;
    state: string;
    merged: boolean;
    headBranch: string;
    baseBranch: string;
    headSha: string;
    author: { login: string; avatarUrl: string };
    reviewers: { login: string; avatarUrl: string }[];
    mergeable: boolean | null;
    createdAt: string;
    updatedAt: string;
    additions: number;
    deletions: number;
    changedFiles: number;
    checkStatus: string | null;
  }> {
    const { data } = await this.octokit.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });

    const { data: reviews } = await this.octokit.pulls.listReviews({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });

    const reviewerMap = new Map<string, { login: string; avatarUrl: string }>();
    for (const review of reviews) {
      if (review.user && !reviewerMap.has(review.user.login)) {
        reviewerMap.set(review.user.login, {
          login: review.user.login,
          avatarUrl: review.user.avatar_url,
        });
      }
    }

    // Get check status
    let checkStatus: string | null = null;
    try {
      const { data: checkRuns } = await this.octokit.checks.listForRef({
        owner: this.owner,
        repo: this.repo,
        ref: data.head.sha,
      });
      if (checkRuns.total_count > 0) {
        const allComplete = checkRuns.check_runs.every((c) => c.status === "completed");
        const allSuccess = checkRuns.check_runs.every((c) => c.conclusion === "success");
        if (!allComplete) checkStatus = "pending";
        else if (allSuccess) checkStatus = "success";
        else checkStatus = "failure";
      }
    } catch {
      // Check runs may not be available
    }

    return {
      title: data.title,
      body: data.body,
      state: data.merged ? "merged" : data.state,
      merged: data.merged,
      headBranch: data.head.ref,
      baseBranch: data.base.ref,
      headSha: data.head.sha,
      author: {
        login: data.user?.login || "unknown",
        avatarUrl: data.user?.avatar_url || "",
      },
      reviewers: Array.from(reviewerMap.values()),
      mergeable: data.mergeable,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      additions: data.additions,
      deletions: data.deletions,
      changedFiles: data.changed_files,
      checkStatus,
    };
  }

  async getPRCommits(prNumber: number): Promise<
    {
      sha: string;
      message: string;
      author: { login: string; avatarUrl: string };
      date: string;
    }[]
  > {
    const { data } = await this.octokit.pulls.listCommits({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
      per_page: 100,
    });

    return data.map((c) => ({
      sha: c.sha,
      message: c.commit.message,
      author: {
        login: c.author?.login || c.commit.author?.name || "unknown",
        avatarUrl: c.author?.avatar_url || "",
      },
      date: c.commit.author?.date || "",
    }));
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
