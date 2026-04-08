import { GITHUB_API_BASE } from '../utils/constants';

interface GitHubContentItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url: string | null;
}

export async function fetchReportDates(
  owner: string,
  repo: string
): Promise<string[]> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/reports`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`GitHub API error: ${resp.status}`);

  const items: GitHubContentItem[] = await resp.json();
  return items
    .filter((f) => f.name.endsWith('.md') && f.name !== 'README.md')
    .map((f) => f.name.replace('.md', ''))
    .sort()
    .reverse();
}

export async function fetchReportContent(
  owner: string,
  repo: string,
  date: string
): Promise<string> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/reports/${date}.md`;
  const resp = await fetch(url, {
    headers: { Accept: 'application/vnd.github.v3.raw' },
  });
  if (!resp.ok) throw new Error(`Report not found: ${date}`);
  return resp.text();
}

export async function fetchDashboardData(
  owner: string,
  repo: string
): Promise<Record<string, unknown>> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/dashboard/data.json`;
  const resp = await fetch(url, {
    headers: { Accept: 'application/vnd.github.v3.raw' },
  });
  if (!resp.ok) {
    if (resp.status === 403) throw new Error('GitHub API rate limit reached. Try again in a few minutes.');
    if (resp.status === 404) throw new Error('Dashboard data not found. Check repository settings.');
    throw new Error(`Failed to load data (HTTP ${resp.status})`);
  }
  return resp.json();
}
