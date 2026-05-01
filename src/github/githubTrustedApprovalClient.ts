/**
 * P29.5: GitHub Trusted Approval Client
 *
 * Thin wrapper around GitHub REST API for fetching PR reviews and labels.
 * Used by trustedApprovalResolver to determine if trusted approval exists.
 *
 * API endpoints:
 *   - GET /repos/{owner}/{repo}/pulls/{number}/reviews
 *   - GET /repos/{owner}/{repo}/issues/{number}/labels
 *   - GET /repos/{owner}/{repo}/collaborators/{username}/permission
 *
 * Required permissions:
 *   - pull-requests: read
 *   - issues: read (labels are on the issues API)
 *
 * ref: P29.5 section 12
 */

import type { GitHubReviewInfo, GitHubLabelInfo } from "../trust/trustedApprovalResolver.js";
import type { TrustedApprovalSummary } from "../policy/contractGateTypes.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchPullRequestReviews(input: {
  owner: string;
  repo: string;
  prNumber: number;
  token: string;
  apiUrl?: string;
}): Promise<GitHubReviewInfo[]> {
  const { owner, repo, prNumber, token, apiUrl } = input;
  const baseUrl = apiUrl ?? "https://api.github.com";
  const url = `${baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}/reviews`;

  const response = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    console.warn(`[Pantheon] Failed to fetch PR reviews: ${response.status} ${response.statusText}`);
    return [];
  }

  const data = await response.json() as GitHubReviewApiResponse[];

  // We need permission for each reviewer — fetch lazily
  const reviews: GitHubReviewInfo[] = [];
  const permissionCache = new Map<string, TrustedApprovalSummary["permission"]>();

  for (const review of data) {
    if (!review.user?.login) continue;

    let permission = permissionCache.get(review.user.login);
    if (permission === undefined) {
      permission = await fetchCollaboratorPermission({
        owner, repo, username: review.user.login, token, apiUrl: baseUrl,
      });
      permissionCache.set(review.user.login, permission);
    }

    reviews.push({
      author: review.user.login,
      authorPermission: permission,
      state: review.state as GitHubReviewInfo["state"],
      submittedAt: review.submitted_at ?? new Date().toISOString(),
    });
  }

  return reviews;
}

export async function fetchPullRequestLabels(input: {
  owner: string;
  repo: string;
  prNumber: number;
  token: string;
  apiUrl?: string;
}): Promise<GitHubLabelInfo[]> {
  const { owner, repo, prNumber, token, apiUrl } = input;
  const baseUrl = apiUrl ?? "https://api.github.com";
  const url = `${baseUrl}/repos/${owner}/${repo}/issues/${prNumber}/labels`;

  const response = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    console.warn(`[Pantheon] Failed to fetch PR labels: ${response.status} ${response.statusText}`);
    return [];
  }

  const data = await response.json() as GitHubLabelApiResponse[];

  return data.map(label => ({
    name: label.name,
    appliedBy: "unknown", // GitHub labels API doesn't track who applied labels
    appliedByPermission: undefined,
  }));
}

// ---------------------------------------------------------------------------
// Permission check
// ---------------------------------------------------------------------------

async function fetchCollaboratorPermission(input: {
  owner: string;
  repo: string;
  username: string;
  token: string;
  apiUrl: string;
}): Promise<TrustedApprovalSummary["permission"]> {
  const { owner, repo, username, token, apiUrl } = input;
  const url = `${apiUrl}/repos/${owner}/${repo}/collaborators/${username}/permission`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) return undefined;

    const data = await response.json() as { permission?: string };
    return normalizePermission(data.permission);
  } catch {
    return undefined;
  }
}

function normalizePermission(raw?: string): TrustedApprovalSummary["permission"] {
  switch (raw) {
    case "admin": return "admin";
    case "maintain": return "maintain";
    case "write": return "write";
    case "triage": return "triage";
    case "read": return "read";
    default: return undefined;
  }
}

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

type GitHubReviewApiResponse = {
  user?: { login: string };
  state: string;
  submitted_at?: string;
};

type GitHubLabelApiResponse = {
  name: string;
  description?: string;
};
