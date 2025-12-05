#!/bin/bash

# JDK 호환성 문제 해결 스크립트

echo "JDK 호환성 문제 해결 중..."

cd android || exit 1

# 1. Gradle 캐시 정리
echo "1. Gradle 캐시 정리 중..."
rm -rf ~/.gradle/caches/8.9/transforms
rm -rf .gradle
rm -rf app/build
rm -rf build

# 2. Clean 빌드
echo "2. Clean 빌드 중..."
./gradlew clean

# 3. 의존성 새로고침
echo "3. 의존성 새로고침 중..."
./gradlew --refresh-dependencies

echo ""
echo "✅ 캐시 정리 완료!"
echo ""
echo "다음 단계:"
echo "1. Android Studio에서 File > Settings > Build Tools > Gradle"
echo "2. Gradle JDK를 17로 변경"
echo "3. File > Sync Project with Gradle Files"
echo "4. Build > Rebuild Project"

