import fs from 'fs';
const content = fs.readFileSync('src/pages/VuaTiengVietPlayPage.tsx', 'utf8');

// 1. Properly structure the Header
// We need to find the badge section and ensure it's wrapped correctly.
// The current structure at line 220 is:
// <div (220) mt-1>
//   <div (221) pulse />
//   <p (222)>Câu...</p>
//   <div (226) badge>...</div>
// </div> (missing?)

// I'll replace the whole Header area from 208 to the end of that block.
const headerBlockRegex = /<div className=\"flex items-center justify-between w-full sm:w-auto\">\s*<div className=\"flex items-center gap-4\">.*?<div className=\"flex items-center justify-between w-full sm:w-auto gap-3 sm:gap-6\">/s;

const fixedHeaderBlock = `<div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-2xl hover:bg-muted" onClick={() => navigate("/")}>
              <Home className="h-5 w-5 text-muted-foreground" />
            </Button>
            <div className="h-8 w-px bg-border/60 mx-1 hidden sm:block" />
            <div className="flex items-center gap-3">
               <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-inner">
                 <Gamepad2 className="h-5 w-5" />
               </div>
               <div>
                 <h1 className="font-heading text-base sm:text-lg font-black leading-none">Vua Tiếng Việt</h1>
                 <div className="flex items-center gap-2 mt-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">
                      Câu {currentIdx + 1} / {questions.length}
                    </p>
                    <div className="flex items-center gap-2 ml-2">
                       <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[8px] font-black uppercase tracking-widest shadow-sm">
                         Thử thách {currentIdx + 1}
                       </span>
                       <Info className="h-3 w-3 text-muted-foreground" />
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between w-full sm:w-auto gap-3 sm:gap-6">`;

let newContent = content;
if (headerBlockRegex.test(content)) {
    newContent = newContent.replace(headerBlockRegex, fixedHeaderBlock);
    console.log('Fixed Header block structure');
} else {
    console.log('Could not find Header block regex - trying fallback');
}

// 2. Re-balance divs from scratch after structure fix
const opens = (newContent.match(/<div/g) || []).length;
const closes = (newContent.match(/<\/div>/g) || []).length;
const diff = opens - closes;
console.log(`Phase 2 - Opens: ${opens}, Closes: ${closes}, Diff: ${diff}`);

// Remove all current trailing divs and recalculate
const lastCorrectLineIndex = newContent.lastIndexOf('{isFinished && (');
if (lastCorrectLineIndex !== -1) {
    // Keep everything up to the end of isFinished block
    const endOfBlock = newContent.indexOf(')}', lastCorrectLineIndex) + 2;
    const baseContent = newContent.substring(0, endOfBlock);
    
    // Recount tags in baseContent
    const bOpens = (baseContent.match(/<div/g) || []).length;
    const bCloses = (baseContent.match(/<\/div>/g) || []).length;
    const bDiff = bOpens - bCloses;
    
    console.log(`Base Content - Opens: ${bOpens}, Closes: ${bCloses}, Diff: ${bDiff}`);
    
    const finalContent = baseContent + '\n' + '    </div>\n'.repeat(bDiff) + '  );\n}';
    fs.writeFileSync('src/pages/VuaTiengVietPlayPage.tsx', finalContent);
    console.log(`Re-balanced with ${bDiff} tags`);
} else {
    console.log('Fatal: Could not find isFinished block');
}
