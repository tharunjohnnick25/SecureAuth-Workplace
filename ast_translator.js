const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');

const project = new Project();
project.addSourceFilesAtPaths(['app/**/*.tsx', 'components/**/*.tsx']);

let nextKeyId = 1;
const extractedStrings = {};

const generateKey = (text) => {
  const clean = text.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
  return `${clean}_${nextKeyId++}`;
};

for (const sourceFile of project.getSourceFiles()) {
  const hasMetadata = sourceFile.getVariableDeclaration('metadata') || sourceFile.getExportedDeclarations().has('metadata');
  if (hasMetadata) {
    console.log(`Skipping ${sourceFile.getFilePath()} due to metadata export`);
    continue;
  }

  let hasModifications = false;
  let hasTCall = false;

  const jsxTextNodes = sourceFile.getDescendantsOfKind(SyntaxKind.JsxText);
  
  for (const node of jsxTextNodes) {
    const text = node.getLiteralText();
    if (text.trim().length > 1 && /[a-zA-Z]/.test(text)) {
      const key = generateKey(text.trim());
      extractedStrings[key] = text.trim();
      node.replaceWithText(`{t('${key}')}`);
      hasModifications = true;
    }
  }

  // Also replace simple string props in JSX elements if we wanted to, but let's stick to text nodes for safety

  if (hasModifications) {
    // 1. Ensure 'use client'
    const statements = sourceFile.getStatements();
    const hasUseClient = statements.some(s => s.getKind() === SyntaxKind.ExpressionStatement && s.getText().includes('use client'));
    if (!hasUseClient) {
      sourceFile.insertStatements(0, "'use client';\n");
    }

    // 2. Ensure import
    const imports = sourceFile.getImportDeclarations();
    const hasImport = imports.some(i => i.getModuleSpecifierValue() === '@/context/LanguageContext');
    if (!hasImport) {
      // insert after last import or at top (after use client)
      const lastImportIndex = imports.length > 0 ? imports[imports.length - 1].getChildIndex() + 1 : 1;
      sourceFile.insertImportDeclaration(lastImportIndex, {
        namedImports: ['useLanguage'],
        moduleSpecifier: '@/context/LanguageContext'
      });
    }

    // 3. Inject `const { t } = useLanguage();` into default export or exported functions
    const functions = [...sourceFile.getFunctions(), ...sourceFile.getVariableDeclarations().filter(v => v.getInitializer()?.getKind() === SyntaxKind.ArrowFunction)];
    
    for (const func of functions) {
      // Check if it returns JSX
      const bodyText = func.getText();
      if (bodyText.includes('<') && bodyText.includes('/>') || bodyText.includes('</')) {
        let block;
        if (func.getKind() === SyntaxKind.FunctionDeclaration) {
          block = func.getBody();
        } else {
          const init = func.getInitializer();
          if (init.getKind() === SyntaxKind.ArrowFunction) {
            block = init.getBody();
          }
        }

        if (block && block.getKind() === SyntaxKind.Block) {
          const hasHook = block.getText().includes('useLanguage(');
          if (!hasHook) {
            block.insertStatements(0, 'const { t } = useLanguage();');
          }
        } else if (block && block.getKind() !== SyntaxKind.Block) {
          // It's an implicit return arrow function e.g. const Comp = () => <div/>
          // Convert to block. This is complex to do via AST quickly, so we skip for now or rely on them being normal functions
        }
      }
    }
    
    sourceFile.saveSync();
    console.log(`Updated ${sourceFile.getFilePath()}`);
  }
}

fs.writeFileSync('extracted_translations.json', JSON.stringify(extractedStrings, null, 2));
console.log('Done! Extracted strings saved to extracted_translations.json');
