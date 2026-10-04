import { Octokit } from "@octokit/rest";
import { detectLanguage, shouldIndexFile } from "./fileTypeHelper";

function getOctokit(token) {
    const pat = token || process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;
    return pat ? new Octokit({ auth: pat }) : new Octokit();
}

function parseRepoInput(input) {
    if (!input) throw new Error('Repository URL or owner/repo is required');
    const clean = input.trim().replace(/\/$/, '').replace(/\.git$/, '');
    const match = clean.match(/(?:github\.com\/)?([^/]+)\/([^/]+)$/);
    if (match) return { owner: match[1], repo: match[2] };
    throw new Error('Invalid repository format. Please enter "owner/repo" or a valid Github URL')
}

// fetchRepodetails , fetchrepotree ,  fetchfilecontent , fetchrecentcommits 
async function fetchRepoDetails(owner, repo, token) {
    const octokit = getOctokit(token);
    const { data } = await octokit.rest.repos.get({ owner, repo });
    return {
        owner: data.owner.login,
        name: data.name,
        fullName: data.full_name,
        url: data.html_url,
        defaultBranch: data.default_branch,
        description: data.description,
        stars: data.stargazers_count,
        forks: data.forks_count,
        language: data.language
    };
}

async function fetchRepoTree(owner, repo, token, branch = "main") {
    const octokit = getOctokit(token);
    let commitSha = branch;
    try {
        const { data: refData } = await octokit.rest.repos.getBranch({ owner, repo, branch });
        commitSha = refData.commit.sha;
    } catch (e) {
        console.warn(`[Github] Could not resolve branch ${branch} : ${err.message}. Using branch  name as tree_sha`);
    }

    const { data: treeData } = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: commitSha,
        recursive: '1'
    });

    const files = [];
    const languageCounts = {};

    for (const item of treeData.tree) {
        if (item.type === 'blob') {
            const ext = item.path.includes('.') ? item.path.split('.').pop() : '';
            const lang = detectLanguage(item.path);
            const isCandidate = shouldIndexFile(item.path, item.size);

            files.push({
                path: item.path,
                name: item.path.split('/').pop(),
                extension: ext,
                size: item.size,
                sha: item.sha,
                language: lang,
                isIndexable: isCandidate
            });

            if (isCandidate) {
                languageCounts[lang] = (languageCounts[lang] || 0) + 1;
            }
        }

    }

    return {
        commitSha,
        tree: files,
        totalFiles: files.length,
        indexableFiles: files.filter(f => f.isIndexable).length,
        languages: languageCounts
    }

}

async function fetchFileContent(owner, repo, path, branch = 'main', token) {
    const octokit = getOctokit(token);
    try {
        const { data } = await octokit.rest.repos.getContent({ owner, repo, path, ref: branch });
        if (data.content && data.encoding == 'base64') {
            return Buffer.from(data.content, 'base64').toString('utf8');
        } else if (typeof data === 'string') {
            return data;
        }
        return '';
    } catch (e) {
        try {
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
            const res = await fetch(rawUrl);
            if (res.ok) return await res.text();
        } catch (fetchErr) { }

        throw new Error(`Failed to fetch content for ${path} : ${err.message}`);
    }
}


async function fetchRecentCommits(owner, repo, limit = 5, token) {
    const octokit = getOctokit(token);
    try {
        const { data } = await octokit.rest.repos.listCommits({ owner, repo, per_page: limit });
        return map.data(c => ({
            sha: c.sha.slice(0, 7),
            message: c.commit.message.split('\n')[0],
            author: c.commit.author ? c.commit.author.name : 'Unknown',
            date: c.commit.author ? c.commit.author.date : null
        }));
    } catch (e) {
        console.warn(`[Github] Commits  fetch error : ${err.message}`);
        return [];
    }
}

export {
    parseRepoInput,
    detectLanguage,
    shouldIndexFile,
    fetchFileContent,
    fetchRepoDetails,
    fetchRepoTree,
    fetchRecentCommits,
};



