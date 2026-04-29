import type { GitHubCommentOperationResult, GitHubPullRequestContext } from "./githubActionTypes.js";

export async function postOrUpdatePantheonComment(input: {
  prContext: GitHubPullRequestContext | null;
  githubToken: string | undefined;
  marker: string;
  markdown: string;
  githubApiUrl?: string;
}): Promise<GitHubCommentOperationResult> {
  if (!input.prContext) {
    return { status: "skipped", reason: "No pull request context available." };
  }
  if (!input.githubToken) {
    return { status: "skipped", reason: "No GITHUB_TOKEN available." };
  }

  const apiBase = input.githubApiUrl ?? "https://api.github.com";
  const commentsUrl = `${apiBase}/repos/${input.prContext.owner}/${input.prContext.repo}/issues/${input.prContext.prNumber}/comments`;
  const headers = {
    Authorization: `Bearer ${input.githubToken}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "pantheon-boundary-check",
  };

  try {
    const listResponse = await fetch(commentsUrl, { headers });
    if (!listResponse.ok) {
      return { status: "failed", reason: `Failed to list PR comments: ${listResponse.status}` };
    }

    const comments = await listResponse.json() as Array<{
      id: number;
      body?: string;
      user?: { login?: string };
    }>;
    const existing = comments.find(comment =>
      comment.body?.includes(input.marker) && (comment.user?.login?.endsWith("[bot]") ?? true),
    );

    if (existing) {
      const updateResponse = await fetch(`${apiBase}/repos/${input.prContext.owner}/${input.prContext.repo}/issues/comments/${existing.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ body: input.markdown }),
      });
      if (!updateResponse.ok) {
        return { status: "failed", reason: `Failed to update PR comment: ${updateResponse.status}` };
      }
      return { status: "updated", commentId: existing.id };
    }

    const createResponse = await fetch(commentsUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ body: input.markdown }),
    });
    if (!createResponse.ok) {
      return { status: "failed", reason: `Failed to create PR comment: ${createResponse.status}` };
    }
    const created = await createResponse.json() as { id: number };
    return { status: "created", commentId: created.id };
  } catch (error) {
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
