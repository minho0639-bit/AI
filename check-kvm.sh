#!/bin/bash

# KVM 설정 상태 확인 스크립트

echo "=== KVM 설정 상태 확인 ==="
echo ""

# 1. CPU 가상화 지원 확인
echo "1. CPU 가상화 지원 확인:"
VMX_COUNT=$(egrep -c 'vmx' /proc/cpuinfo 2>/dev/null || echo "0")
SVM_COUNT=$(egrep -c 'svm' /proc/cpuinfo 2>/dev/null || echo "0")

if [ "$VMX_COUNT" -gt 0 ]; then
    echo "   ✓ Intel VT-x 지원됨 ($VMX_COUNT cores)"
elif [ "$SVM_COUNT" -gt 0 ]; then
    echo "   ✓ AMD SVM 지원됨 ($SVM_COUNT cores)"
else
    echo "   ✗ CPU 가상화 미지원"
fi
echo ""

# 2. KVM 모듈 확인
echo "2. KVM 모듈 확인:"
if lsmod | grep -q kvm; then
    echo "   ✓ KVM 모듈이 로드되어 있습니다"
    lsmod | grep kvm
else
    echo "   ✗ KVM 모듈이 로드되지 않았습니다"
    echo "   다음 명령 실행: sudo modprobe kvm"
fi
echo ""

# 3. /dev/kvm 확인
echo "3. /dev/kvm 디바이스 확인:"
if [ -e /dev/kvm ]; then
    echo "   ✓ /dev/kvm 파일이 존재합니다"
    ls -l /dev/kvm
    if [ -r /dev/kvm ] && [ -w /dev/kvm ]; then
        echo "   ✓ 읽기/쓰기 권한이 있습니다"
    else
        echo "   ✗ 권한이 없습니다. 다음 명령 실행:"
        echo "     sudo chmod 666 /dev/kvm"
    fi
else
    echo "   ✗ /dev/kvm 파일이 없습니다"
    echo "   다음 명령 실행: sudo mknod /dev/kvm c 10 232"
fi
echo ""

# 4. 사용자 그룹 확인
echo "4. 사용자 그룹 확인:"
if groups | grep -q kvm; then
    echo "   ✓ 현재 사용자가 kvm 그룹에 속해있습니다"
else
    echo "   ✗ 현재 사용자가 kvm 그룹에 속해있지 않습니다"
    echo "   다음 명령 실행: sudo usermod -aG kvm $USER"
    echo "   그 후 로그아웃 후 다시 로그인하세요"
fi
echo ""

# 5. 요약 및 권장 사항
echo "=== 요약 ==="
if [ -e /dev/kvm ] && [ -r /dev/kvm ] && [ -w /dev/kvm ] && groups | grep -q kvm; then
    echo "✓ KVM이 제대로 설정되어 있습니다!"
    echo "  Android 에뮬레이터를 실행할 수 있습니다."
else
    echo "✗ KVM 설정이 완료되지 않았습니다."
    echo ""
    echo "권장 사항:"
    echo "1. 실제 Android 기기를 사용하세요 (가장 쉬운 방법)"
    echo "2. 또는 위의 지시사항에 따라 KVM을 설정하세요"
fi

