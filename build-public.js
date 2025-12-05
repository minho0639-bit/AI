/**
 * 웹 파일을 public 디렉토리로 복사하는 빌드 스크립트
 */
const fs = require('fs');
const path = require('path');

const sourceDir = __dirname;
const targetDir = path.join(__dirname, 'public');

// public 디렉토리 생성
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 복사할 파일 및 디렉토리 목록
const filesToCopy = [
  // HTML 파일
  'index.html',
  'signup.html',
  'profile.html',
  'letter.html',
  'letter-target.html',
  'letter-stationery.html',
  'letter-compose.html',
  'letter-payment.html',
  'admin.html',
  'terms.html',
  'privacy.html',
  
  // CSS 파일
  'styles.css',
  'signup.css',
  'profile.css',
  'letter.css',
  'letter-stationery.css',
  'letter-compose.css',
  'letter-payment.css',
  'admin.css',
  
  // JS 파일 및 디렉토리
  'js',
  
  // Assets 디렉토리
  'assets',
  
  // 기타 이미지 파일
  'logo.JPG',
  'basic.jpg',
];

// 파일/디렉토리 복사 함수
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const files = fs.readdirSync(src);
    files.forEach(file => {
      copyRecursive(
        path.join(src, file),
        path.join(dest, file)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// 파일 복사 실행
console.log('웹 파일을 public 디렉토리로 복사 중...');

filesToCopy.forEach(item => {
  const srcPath = path.join(sourceDir, item);
  const destPath = path.join(targetDir, item);
  
  if (fs.existsSync(srcPath)) {
    try {
      copyRecursive(srcPath, destPath);
      console.log(`✓ ${item} 복사 완료`);
    } catch (error) {
      console.error(`✗ ${item} 복사 실패:`, error.message);
    }
  } else {
    console.warn(`⚠ ${item} 파일을 찾을 수 없습니다.`);
  }
});

console.log('\n빌드 완료!');

