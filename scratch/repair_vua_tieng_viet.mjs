import fs from 'fs';
let content = fs.readFileSync('src/pages/VuaTiengVietPlayPage.tsx', 'utf8');
const marker = 'userAnswers={userAnswers}';
const idx = content.lastIndexOf(marker);
if (idx !== -1) {
    const base = content.substring(0, idx + marker.length);
    const fixedEnd = `
          onRetry={() => window.location.reload()}
          onHome={() => navigate("/")}
        />
      )}
    </div>
  </div>
  );
}`;
    fs.writeFileSync('src/pages/VuaTiengVietPlayPage.tsx', base + fixedEnd);
    console.log('Successfully repaired the end of VuaTiengVietPlayPage.tsx');
} else {
    console.log('Error: Could not find marker to repair file end');
}
