const fs = require('fs');
const path = require('path');

function main() {
  const root = path.resolve(process.cwd(), 'tests/graphs/buggy');
  if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });
  const files = [];
  // 生成 50 个含未初始化/printf/scanf/死循环/头文件错误的样例
  for (let i = 0; i < 50; i++) {
    const fname = path.join(root, `bug_${i}.c`);
    const code = `#include <stdiox.h> // BUG: Header misspelling\nint main(){\n int x; // BUG: uninitialized\n int *p; // BUG: wild pointer\n printf("%s %d", x, 123); // BUG: type mismatch\n scanf("%d", x); // BUG: missing &\n for(;;){ if(x>0) break; } // BUG: likely infinite\n *p = 1; // BUG: deref wild pointer\n return 0; }\n`;
    fs.writeFileSync(fname, code, 'utf8'); files.push(fname);
  }
  console.log(`Generated ${files.length} buggy files in ${root}`);
}

main();


