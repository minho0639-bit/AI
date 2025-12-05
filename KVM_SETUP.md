# KVM 가상화 설정 가이드

## 문제
`/dev/kvm is not found` 오류는 Linux에서 Android 에뮬레이터를 실행할 때 가상화(KVM)가 활성화되지 않았을 때 발생합니다.

## 해결 방법

### 방법 1: KVM 모듈 확인 및 활성화

#### 1단계: CPU 가상화 지원 확인

```bash
# CPU가 가상화를 지원하는지 확인
egrep -c '(vmx|svm)' /proc/cpuinfo
```

결과가 0보다 크면 가상화를 지원합니다.

#### 2단계: KVM 모듈 로드

```bash
# KVM 모듈 확인
lsmod | grep kvm

# KVM 모듈이 없으면 로드
sudo modprobe kvm
sudo modprobe kvm_intel  # Intel CPU인 경우
# 또는
sudo modprobe kvm_amd    # AMD CPU인 경우
```

#### 3단계: KVM 디바이스 확인

```bash
# /dev/kvm 파일 확인
ls -l /dev/kvm

# 파일이 없으면 생성
sudo mknod /dev/kvm c 10 232
sudo chmod 666 /dev/kvm
```

#### 4단계: 사용자를 kvm 그룹에 추가

```bash
# kvm 그룹 추가 (없으면 생성)
sudo groupadd kvm

# 현재 사용자를 kvm 그룹에 추가
sudo usermod -aG kvm $USER

# 변경사항 적용 (로그아웃 후 다시 로그인하거나)
newgrp kvm
```

#### 5단계: 권한 확인

```bash
# /dev/kvm 권한 확인
ls -l /dev/kvm

# 권한이 올바른지 확인 (rw-rw-rw- 또는 rw-rw----)
sudo chmod 666 /dev/kvm
```

### 방법 2: BIOS에서 VT-x 활성화

1. 컴퓨터 재시작
2. BIOS/UEFI 설정 진입 (보통 F2, F10, Del 키)
3. **Virtualization Technology** 또는 **VT-x** 찾기
4. **Enabled**로 설정
5. 저장 후 재부팅

### 방법 3: 실제 Android 기기 사용 (권장)

KVM 설정이 복잡하거나 불가능한 경우, 실제 Android 기기를 사용하는 것이 더 쉽습니다:

1. Android 기기에서 **개발자 옵션** 활성화:
   - 설정 > 휴대전화 정보 > 빌드 번호를 7번 탭
2. **USB 디버깅** 활성화:
   - 설정 > 개발자 옵션 > USB 디버깅
3. USB 케이블로 컴퓨터에 연결
4. Android Studio에서 기기 선택

### 방법 4: 에뮬레이터를 x86/x86_64로 변경

ARM 에뮬레이터는 KVM이 필요하지만, x86/x86_64는 더 나은 호환성을 제공합니다:

1. Android Studio에서 **Tools** > **Device Manager**
2. 에뮬레이터 편집 또는 새로 만들기
3. 시스템 이미지에서 **x86_64** 또는 **x86** 선택
4. **API 33 이상** 선택

## 빠른 확인 스크립트

다음 명령으로 현재 상태 확인:

```bash
# CPU 가상화 지원 확인
echo "CPU 가상화 지원:"
egrep -c '(vmx|svm)' /proc/cpuinfo

# KVM 모듈 확인
echo -e "\nKVM 모듈:"
lsmod | grep kvm

# /dev/kvm 확인
echo -e "\n/dev/kvm:"
ls -l /dev/kvm 2>/dev/null || echo "파일이 없습니다"

# 사용자 그룹 확인
echo -e "\n현재 사용자 그룹:"
groups | grep kvm && echo "kvm 그룹에 속해있습니다" || echo "kvm 그룹에 속해있지 않습니다"
```

## 문제 해결

### "modprobe: FATAL: Module kvm not found"

KVM 모듈이 설치되지 않았습니다:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install qemu-kvm libvirt-daemon-system libvirt-clients bridge-utils

# CentOS/RHEL
sudo yum install qemu-kvm libvirt virt-install bridge-utils
```

### "Permission denied" 오류

사용자 권한 문제:

```bash
# 사용자를 kvm 그룹에 추가
sudo usermod -aG kvm $USER

# 로그아웃 후 다시 로그인
# 또는
newgrp kvm
```

### "VT-x is disabled in BIOS"

BIOS에서 가상화를 활성화해야 합니다. 위의 "방법 2" 참조.

## 대안: 실제 기기 사용

KVM 설정이 어려운 경우, 실제 Android 기기를 사용하는 것이 가장 간단합니다:

1. USB 디버깅 활성화
2. USB로 연결
3. Android Studio에서 기기 선택

## 추가 리소스

- [Android Emulator 가이드](https://developer.android.com/studio/run/emulator)
- [KVM 설치 가이드](https://help.ubuntu.com/community/KVM/Installation)

