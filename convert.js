import fs from 'fs';
import * as babel from '@babel/core';

function processJson(jsonPath, outPath) {
  let content = fs.readFileSync(jsonPath, 'utf8');
  const jsonStr = content.substring(content.indexOf('{'));
  const data = JSON.parse(jsonStr);
  let tsCode = data.files[0].content;
  
  // Apply cn fix
  tsCode = tsCode.replace(/import \{ cn \} from "@\/lib\/utils"/g, 'import { cn } from "@/components/ui/cn"');
  // Also fix relative imports in some shadcn files just in case
  tsCode = tsCode.replace(/@\/registry\/[^/]+\/ui\//g, '@/components/ui/');

  // Use Babel to strip TS types but keep JSX
  const compiled = babel.transformSync(tsCode, {
    filename: 'temp.tsx',
    presets: [
      ['@babel/preset-typescript', { isTSX: true, allExtensions: true }]
    ],
    // Do NOT include @babel/preset-react, so JSX remains intact!
    retainLines: true
  }).code;
  
  fs.writeFileSync(outPath, compiled);
}

processJson('/home/subi/.gemini/antigravity/brain/973082e4-78a2-47de-98b5-d639e672034e/.system_generated/steps/378/content.md', 'src/components/ui/line-chart.jsx');
processJson('/home/subi/.gemini/antigravity/brain/973082e4-78a2-47de-98b5-d639e672034e/.system_generated/steps/384/content.md', 'src/components/ui/badge.jsx');
processJson('/home/subi/.gemini/antigravity/brain/973082e4-78a2-47de-98b5-d639e672034e/.system_generated/steps/385/content.md', 'src/components/ui/card.jsx');

// Create radar-chart
fs.copyFileSync('src/components/ui/line-chart.jsx', 'src/components/ui/radar-chart.jsx');
