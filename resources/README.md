# 앱 리소스 파일

이 디렉토리는 앱 아이콘과 스플래시 스크린 이미지를 저장하는 곳입니다.

## 필요한 이미지 파일

### 아이콘 (Android)
- `icon-foreground.png` - 1024x1024px (투명 배경)
- `icon-background.png` - 1024x1024px (단색 배경)

### 아이콘 (iOS)
- `icon.png` - 1024x1024px

### 스플래시 스크린
- `splash.png` - 2732x2732px (중앙에 로고, 배경색: #fff7d6)

## 이미지 생성 방법

1. 1024x1024px 크기의 앱 아이콘을 준비하세요
2. Android용은 포그라운드와 백그라운드를 분리하세요
3. 스플래시 스크린은 중앙에 로고를 배치하고 배경색을 #fff7d6로 설정하세요

## Capacitor 리소스 생성

이미지를 준비한 후 다음 명령으로 리소스를 생성할 수 있습니다:

```bash
npx capacitor-assets generate
```

또는 수동으로:
- Android: `android/app/src/main/res/` 디렉토리에 적절한 크기로 복사
- iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset/` 디렉토리에 복사

