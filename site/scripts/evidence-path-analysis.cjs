// In the handoff ZIP, evidence/ and candidate/ are siblings.
// A local checkout in another layout can be supplied as the first argument.
const fs=require('node:fs'),path=require('node:path');
const project=process.argv[2]?path.resolve(process.argv[2]):path.join(__dirname,'..','candidate');
const script=path.join(project,'site','scripts','path-analysis.cjs');
if(!fs.existsSync(script))throw Error('Candidate not found. Run: node evidence/path-analysis.cjs <candidate-directory>');
require(script).run(path.join(__dirname,'post-path-analysis.json'));
