#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 SQL Analyzer Pro - Setup Verification\n');

const checks = [
  {
    name: 'Root package.json exists',
    check: () => fs.existsSync('package.json'),
    fix: 'Run npm init or check if package.json is present'
  },
  {
    name: 'Frontend directory exists',
    check: () => fs.existsSync('frontend') && fs.statSync('frontend').isDirectory(),
    fix: 'Ensure frontend directory is present'
  },
  {
    name: 'Server directory exists', 
    check: () => fs.existsSync('server') && fs.statSync('server').isDirectory(),
    fix: 'Ensure server directory is present'
  },
  {
    name: 'Shared directory exists',
    check: () => fs.existsSync('shared') && fs.statSync('shared').isDirectory(),
    fix: 'Ensure shared directory is present'
  },
  {
    name: 'Frontend package.json exists',
    check: () => fs.existsSync('frontend/package.json'),
    fix: 'Create frontend/package.json'
  },
  {
    name: 'Server package.json exists',
    check: () => fs.existsSync('server/package.json'),
    fix: 'Create server/package.json'
  },
  {
    name: 'Shared types exist',
    check: () => fs.existsSync('shared/types/analysis.ts'),
    fix: 'Create shared/types/analysis.ts'
  },
  {
    name: 'Server environment example exists',
    check: () => fs.existsSync('server/env.example'),
    fix: 'Create server/env.example'
  },
  {
    name: 'Frontend environment example exists',
    check: () => fs.existsSync('frontend/env.example'),
    fix: 'Create frontend/env.example'
  },
  {
    name: 'Server logs directory exists',
    check: () => fs.existsSync('server/logs') && fs.statSync('server/logs').isDirectory(),
    fix: 'Create server/logs directory'
  }
];

let passed = 0;
let failed = 0;

checks.forEach(check => {
  try {
    if (check.check()) {
      console.log(`✅ ${check.name}`);
      passed++;
    } else {
      console.log(`❌ ${check.name}`);
      console.log(`   Fix: ${check.fix}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${check.name} (Error: ${error.message})`);
    console.log(`   Fix: ${check.fix}`);
    failed++;
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log('🎉 All checks passed! Your SQL Analyzer Pro setup looks good.');
  console.log('\n📋 Next steps:');
  console.log('1. Set up environment variables:');
  console.log('   cp server/env.example server/.env');
  console.log('   cp frontend/env.example frontend/.env.local');
  console.log('2. Install dependencies: npm run install:all');
  console.log('3. Start development servers: npm run dev');
} else {
  console.log('⚠️  Some checks failed. Please fix the issues above and run this script again.');
  process.exit(1);
} 