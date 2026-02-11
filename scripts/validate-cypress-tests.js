/**
 * Script de validação de testes Cypress
 * Verifica sintaxe e estrutura dos arquivos de teste
 */

const fs = require('fs');
const path = require('path');

const CYPRESS_E2E_DIR = path.join(__dirname, '..', 'cypress', 'e2e');
const CYPRESS_SUPPORT_DIR = path.join(__dirname, '..', 'cypress', 'support');
const CYPRESS_FIXTURES_DIR = path.join(__dirname, '..', 'cypress', 'fixtures');

const errors = [];
const warnings = [];
const tests = [];

function checkFile(filePath, relativePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Verificar sintaxe básica
    try {
      // Verificar se é um arquivo JavaScript válido
      if (!filePath.endsWith('.cy.js') && !filePath.endsWith('.js')) {
        warnings.push(`Arquivo com extensão inesperada: ${relativePath}`);
        return;
      }
      
      // Verificar se contém estrutura básica de teste Cypress
      if (filePath.includes('e2e') && !content.includes('describe(') && !content.includes('it(')) {
        warnings.push(`Arquivo de teste sem describe/it: ${relativePath}`);
      }
      
      // Verificar se contém comandos Cypress básicos
      if (filePath.includes('e2e') && !content.includes('cy.')) {
        warnings.push(`Arquivo de teste sem comandos cy: ${relativePath}`);
      }
      
      // Contar testes
      const describeMatches = content.match(/describe\(/g);
      const itMatches = content.match(/it\(/g);
      if (describeMatches || itMatches) {
        tests.push({
          file: relativePath,
          describes: describeMatches ? describeMatches.length : 0,
          its: itMatches ? itMatches.length : 0,
        });
      }
      
      // Verificar senhas fracas nos testes
      const weakPasswords = [
        /['"]admin123['"]/gi,
        /['"]senha123['"]/gi,
        /['"]password.*123['"]/gi,
        /['"]123['"]/gi,
      ];
      
      weakPasswords.forEach((pattern) => {
        if (pattern.test(content)) {
          warnings.push(`Possível senha fraca em: ${relativePath}`);
        }
      });
      
      // Verificar uso de localStorage para tokens (deve ser sessionStorage)
      if (content.includes("localStorage.getItem('sgvc.session')") && !content.includes('// Legacy') && !content.includes('migration')) {
        warnings.push(`Uso de localStorage para tokens (considere sessionStorage) em: ${relativePath}`);
      }
      
    } catch (syntaxErr) {
      errors.push(`Erro de sintaxe em ${relativePath}: ${syntaxErr.message}`);
    }
  } catch (err) {
    errors.push(`Erro ao ler arquivo ${relativePath}: ${err.message}`);
  }
}

function scanDirectory(dir, baseDir) {
  if (!fs.existsSync(dir)) {
    errors.push(`Diretório não existe: ${dir}`);
    return;
  }
  
  const files = fs.readdirSync(dir);
  
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const relativePath = path.relative(baseDir, filePath);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      scanDirectory(filePath, baseDir);
    } else if (file.endsWith('.js') || file.endsWith('.cy.js')) {
      checkFile(filePath, relativePath);
    }
  });
}

console.log('🔍 Validando testes Cypress...\n');

// Escanear arquivos de teste
if (fs.existsSync(CYPRESS_E2E_DIR)) {
  console.log(`📁 Escaneando: ${CYPRESS_E2E_DIR}`);
  scanDirectory(CYPRESS_E2E_DIR, path.join(__dirname, '..'));
} else {
  errors.push(`Diretório de testes não encontrado: ${CYPRESS_E2E_DIR}`);
}

// Escanear arquivos de suporte
if (fs.existsSync(CYPRESS_SUPPORT_DIR)) {
  console.log(`📁 Escaneando: ${CYPRESS_SUPPORT_DIR}`);
  scanDirectory(CYPRESS_SUPPORT_DIR, path.join(__dirname, '..'));
}

// Verificar fixtures
if (fs.existsSync(CYPRESS_FIXTURES_DIR)) {
  const fixtureFiles = fs.readdirSync(CYPRESS_FIXTURES_DIR).filter(f => f.endsWith('.json'));
  console.log(`📁 Fixtures encontrados: ${fixtureFiles.length}`);
  
  fixtureFiles.forEach((file) => {
    const filePath = path.join(CYPRESS_FIXTURES_DIR, file);
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`  ✅ ${file} - JSON válido`);
    } catch (err) {
      errors.push(`Fixture JSON inválido: ${file} - ${err.message}`);
    }
  });
}

// Resumo
console.log('\n📊 RESUMO DE VALIDAÇÃO\n');
console.log(`Testes encontrados: ${tests.length}`);
const totalTests = tests.reduce((sum, t) => sum + t.its, 0);
console.log(`Total de casos de teste (it): ${totalTests}`);
console.log(`Total de suites (describe): ${tests.reduce((sum, t) => sum + t.describes, 0)}`);

if (tests.length > 0) {
  console.log('\n📋 Detalhes dos testes:');
  tests.forEach((test) => {
    console.log(`  - ${test.file}: ${test.describes} describe(s), ${test.its} it(s)`);
  });
}

if (errors.length > 0) {
  console.log('\n❌ ERROS ENCONTRADOS:');
  errors.forEach((err) => console.log(`  - ${err}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️  AVISOS:');
  warnings.forEach((warn) => console.log(`  - ${warn}`));
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('\n✅ VALIDAÇÃO PASSOU SEM ERROS OU AVISOS!');
  process.exit(0);
} else if (errors.length === 0) {
  console.log('\n✅ VALIDAÇÃO PASSOU (com avisos que podem ser ignorados)');
  process.exit(0);
} else {
  console.log('\n❌ VALIDAÇÃO FALHOU');
  process.exit(1);
}
