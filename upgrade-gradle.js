/**
 * Gradle 버전을 8.9로 업그레이드하는 스크립트
 */
const fs = require('fs');
const path = require('path');

const androidDir = path.join(__dirname, 'android');
const gradleWrapperPropsPath = path.join(androidDir, 'gradle', 'wrapper', 'gradle-wrapper.properties');
const buildGradlePath = path.join(androidDir, 'build.gradle');

// Android 디렉토리 확인
if (!fs.existsSync(androidDir)) {
  console.log('❌ Android 디렉토리를 찾을 수 없습니다.');
  console.log('먼저 "npx cap add android"를 실행하세요.');
  process.exit(1);
}

// gradle-wrapper.properties 파일 업데이트
function updateGradleWrapper() {
  if (!fs.existsSync(gradleWrapperPropsPath)) {
    console.log('⚠ gradle-wrapper.properties 파일을 찾을 수 없습니다.');
    console.log(`경로: ${gradleWrapperPropsPath}`);
    return false;
  }

  let content = fs.readFileSync(gradleWrapperPropsPath, 'utf8');
  
  // Gradle 버전 패턴 찾기 및 교체
  const versionPattern = /distributionUrl=.*gradle-(\d+\.\d+(?:\.\d+)?)-/;
  const match = content.match(versionPattern);
  
  if (match) {
    const oldVersion = match[1];
    console.log(`현재 Gradle 버전: ${oldVersion}`);
    
    if (oldVersion === '8.9') {
      console.log('✓ 이미 Gradle 8.9를 사용하고 있습니다.');
      return true;
    }
    
    // 8.9로 업데이트
    content = content.replace(
      /distributionUrl=.*gradle-[\d.]+-/,
      'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.9-all.zip'
    );
    
    fs.writeFileSync(gradleWrapperPropsPath, content, 'utf8');
    console.log('✓ Gradle 버전을 8.9로 업데이트했습니다.');
    return true;
  } else {
    // 패턴을 찾을 수 없으면 직접 추가
    if (!content.includes('distributionUrl')) {
      content += '\ndistributionUrl=https\\://services.gradle.org/distributions/gradle-8.9-all.zip\n';
      fs.writeFileSync(gradleWrapperPropsPath, content, 'utf8');
      console.log('✓ Gradle 8.9 설정을 추가했습니다.');
      return true;
    }
  }
  
  return false;
}

// build.gradle 파일 확인 (선택사항)
function checkBuildGradle() {
  if (fs.existsSync(buildGradlePath)) {
    let content = fs.readFileSync(buildGradlePath, 'utf8');
    
    // Android Gradle Plugin 버전 확인
    const agpPattern = /com\.android\.tools\.build:gradle:([\d.]+)/;
    const match = content.match(agpPattern);
    
    if (match) {
      const agpVersion = match[1];
      console.log(`현재 Android Gradle Plugin 버전: ${agpVersion}`);
      
      // AGP 8.1 이상 권장
      const versionParts = agpVersion.split('.').map(Number);
      if (versionParts[0] < 8 || (versionParts[0] === 8 && versionParts[1] < 1)) {
        console.log('⚠ Android Gradle Plugin을 8.1 이상으로 업그레이드하는 것을 권장합니다.');
        console.log('  build.gradle 파일에서 다음을 수정하세요:');
        console.log('  classpath \'com.android.tools.build:gradle:8.1.0\'');
      }
    }
  }
}

// 메인 실행
console.log('Gradle 버전 업그레이드 중...\n');

const success = updateGradleWrapper();

if (success) {
  checkBuildGradle();
  console.log('\n✅ 완료!');
  console.log('\n다음 단계:');
  console.log('1. Android Studio에서 File > Sync Project with Gradle Files');
  console.log('2. 또는 명령줄에서: cd android && ./gradlew --refresh-dependencies');
} else {
  console.log('\n❌ Gradle 버전 업데이트에 실패했습니다.');
  console.log('수동으로 다음 파일을 수정하세요:');
  console.log(`  ${gradleWrapperPropsPath}`);
  console.log('\n다음 줄을 찾아서:');
  console.log('  distributionUrl=...gradle-8.0.2-...');
  console.log('\n다음으로 변경:');
  console.log('  distributionUrl=https\\://services.gradle.org/distributions/gradle-8.9-all.zip');
  process.exit(1);
}


