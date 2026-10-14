// Read-only upstream drift check. Never fetches tags, merges or executes upstream code.
import fs from 'node:fs/promises';
const sources=JSON.parse(await fs.readFile(new URL('../docs/upstream-sources.json',import.meta.url),'utf8'));
let failed=false;
for(const source of sources){
  try {
    const response=await fetch(`https://api.github.com/repos/${source.repository}/commits/${source.branch}`,{
      headers:{Accept:'application/vnd.github+json','User-Agent':'BeatBrowser-upstream-review'},signal:AbortSignal.timeout(15000),
    });
    if(!response.ok)throw Error(`GitHub returned ${response.status}`);
    const head=await response.json();
    console.log(JSON.stringify({repository:source.repository,reviewed:source.reviewedCommit,latest:head.sha,
      needsReview:source.reviewedCommit!==head.sha,url:head.html_url}));
  }catch(error){failed=true;console.error(`${source.repository}: ${error.message}`);}
}
if(failed)process.exitCode=1;
