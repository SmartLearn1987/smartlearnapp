import fs from 'fs';
const content = fs.readFileSync('src/pages/VuaTiengVietPlayPage.tsx', 'utf8');

// 1. Fix corrupted header
const corruptedRegex = /<Button onClick=\{handleFinish\} className=\"rounded-2xl h-10 sm:h-11 px-6 sm:px-8 font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex-1 sm:flex-none\">\s*K.*?(?=<div className=\"flex-1 flex flex-col)/s;
const fixedText = `<Button onClick={handleFinish} className="rounded-2xl h-10 sm:h-11 px-6 sm:px-8 font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex-1 sm:flex-none">
             Kết thúc
           </Button>
        </div>
      </div>

      `;

let newContent = content;
if (corruptedRegex.test(content)) {
    newContent = newContent.replace(corruptedRegex, fixedText);
    console.log('Fixed corrupted header');
} else {
    console.log('Could not find corrupted header - might be already partially fixed or regex mismatch');
}

// 2. Ensure divs are balanced
const opens = (newContent.match(/<div/g) || []).length;
const closes = (newContent.match(/<\/div>/g) || []).length;
const diff = opens - closes;

console.log(`Current Opens: ${opens}, Closes: ${closes}, Diff: ${diff}`);

if (diff > 0) {
    const lastPart = '    </div>\n  );\n}';
    const lastClosingIndex = newContent.lastIndexOf(lastPart);
    
    if (lastClosingIndex !== -1) {
        const insertion = '      </div>\n'.repeat(diff);
        newContent = newContent.substring(0, lastClosingIndex) + insertion + newContent.substring(lastClosingIndex);
        console.log(`Added ${diff} closing divs`);
    } else {
        console.log('Could not find standard closing block, appending to end of JSX');
        // fallback
        const lastDiv = newContent.lastIndexOf('    </div>');
        if (lastDiv !== -1) {
             newContent = newContent.substring(0, lastDiv + 10) + '\n' + '    </div>\n'.repeat(diff) + newContent.substring(lastDiv + 10);
        }
    }
}

fs.writeFileSync('src/pages/VuaTiengVietPlayPage.tsx', newContent);
