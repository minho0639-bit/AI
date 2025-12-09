/**
 * API 설정 및 유틸리티
 * 하이브리드 앱에서 서버 연결을 위한 설정
 */

// 프로덕션 서버 URL (실제 배포 시 변경 필요)
// 예: 'http://b-itsolution.com:3202' 또는 'https://your-server.com'
const PRODUCTION_API_URL = 'http://b-itsolution.com:3202';

// 개발 서버 URL (로컬 개발용)
// ⚠️ 중요: 모바일 앱에서는 localhost가 작동하지 않습니다!
// 컴퓨터의 로컬 네트워크 IP 주소를 사용하세요 (예: 192.168.1.100:3000)
// IP 주소 확인 방법:
// - Windows: ipconfig (IPv4 주소 확인)
// - macOS/Linux: ifconfig 또는 ip addr
const DEVELOPMENT_API_URL = 'http://localhost:3000';

// 개발 서버의 로컬 네트워크 IP 주소 (모바일 앱용)
// 이 값을 컴퓨터의 실제 IP 주소로 변경하세요
// 예: 'http://192.168.1.100:3000'
const DEVELOPMENT_MOBILE_API_URL = 'http://192.168.219.202:3000';

// Capacitor 환경 확인
const isCapacitor = typeof window !== 'undefined' && window.Capacitor;

// 현재 환경에 따른 API 베이스 URL 결정
function getApiBaseUrl() {
  // 서버에서 설정한 SERVER_URL이 있으면 우선 사용 (카카오 콜백 페이지 등)
  if (typeof window !== 'undefined' && window.SERVER_URL) {
    console.log('서버에서 설정한 URL 사용:', window.SERVER_URL);
    return window.SERVER_URL;
  }
  
  // Capacitor 앱 환경인 경우
  if (isCapacitor) {
    // 개발 모드 확인 (URL에 localhost가 포함되어 있으면 개발 모드)
    const isDevelopment = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1' ||
                          DEVELOPMENT_MOBILE_API_URL.includes('192.168') ||
                          DEVELOPMENT_MOBILE_API_URL.includes('10.0');
    
    if (isDevelopment && DEVELOPMENT_MOBILE_API_URL && !DEVELOPMENT_MOBILE_API_URL.includes('localhost')) {
      console.log('Capacitor 개발 환경: 로컬 네트워크 IP 사용:', DEVELOPMENT_MOBILE_API_URL);
      console.log('⚠️ IP 주소가 올바른지 확인하세요:', DEVELOPMENT_MOBILE_API_URL);
      return DEVELOPMENT_MOBILE_API_URL;
    }
    
    // 프로덕션 서버 URL 사용
    if (PRODUCTION_API_URL && PRODUCTION_API_URL !== 'http://b-itsolution.com:3202') {
      console.log('Capacitor 환경: PRODUCTION_API_URL 사용:', PRODUCTION_API_URL);
      return PRODUCTION_API_URL;
    }
    
    // capacitor.config.json의 server.hostname 사용
    try {
      const config = window.Capacitor?.getConfig?.();
      const configHostname = config?.server?.hostname;
      if (configHostname) {
        // androidScheme에 따라 http 또는 https 사용
        const scheme = config?.server?.androidScheme || 'http';
        const url = `${scheme}://${configHostname}`;
        console.log('Capacitor 환경: config에서 가져온 URL:', url);
        return url;
      }
    } catch (e) {
      console.warn('Capacitor config를 가져올 수 없습니다:', e);
    }
    
    // 기본값: 실제 서버 주소
    const defaultUrl = PRODUCTION_API_URL || 'http://b-itsolution.com:3202';
    console.log('Capacitor 환경: 기본 URL 사용:', defaultUrl);
    return defaultUrl;
  }
  
  // 웹 브라우저 환경인 경우
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('웹 브라우저 환경: 개발 서버 사용:', DEVELOPMENT_API_URL);
    return DEVELOPMENT_API_URL;
  }
  
  // 프로덕션 웹 환경
  console.log('웹 브라우저 환경: 현재 origin 사용:', window.location.origin);
  return window.location.origin;
}

// API 베이스 URL
const API_BASE_URL = getApiBaseUrl();
console.log('최종 API_BASE_URL:', API_BASE_URL);

/**
 * API 호출 래퍼 함수
 * @param {string} endpoint - API 엔드포인트 (예: '/api/login')
 * @param {object} options - fetch 옵션
 * @returns {Promise<Response>}
 */
async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_BASE_URL}${endpoint}`;
  
  console.log('API 호출:', url, 'endpoint:', endpoint, 'API_BASE_URL:', API_BASE_URL);
  
  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    console.log('Fetch 요청 시작:', url);
    console.log('요청 옵션:', {
      method: mergedOptions.method || 'GET',
      headers: mergedOptions.headers,
      credentials: mergedOptions.credentials
    });
    
    const response = await fetch(url, mergedOptions);
    console.log('API 응답 상태:', response.status, response.statusText, 'URL:', url);
    console.log('응답 헤더:', Object.fromEntries(response.headers.entries()));
    
    // 쿠키 확인
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      console.log('서버에서 쿠키 설정:', setCookieHeader);
    } else {
      console.warn('서버에서 쿠키를 설정하지 않았습니다. (이미 설정되어 있거나 세션이 없을 수 있음)');
    }
    
    // 요청에 포함된 쿠키 확인 (document.cookie는 WebView에서 제한적일 수 있음)
    if (typeof document !== 'undefined' && document.cookie) {
      console.log('현재 쿠키:', document.cookie);
    }
    
    // 401 에러 처리 (인증 필요)
    // 관리자 페이지에서는 리다이렉트하지 않음 (관리자 페이지가 자체 로그인 폼을 가지고 있음)
    if (response.status === 401) {
      const isAdminPage = window.location.pathname === '/admin.html' || 
                          window.location.pathname.includes('admin.html');
      
      if (!isAdminPage) {
        if (isCapacitor) {
          const { App } = await import('@capacitor/app');
          // 앱에서 로그인 페이지로 이동
          window.location.href = '/signup.html';
        } else {
          window.location.href = '/signup.html';
        }
      }
      throw new Error('인증이 필요합니다.');
    }
    
    return response;
  } catch (error) {
    console.error('API 호출 오류 상세:');
    console.error('- 오류 타입:', error.name);
    console.error('- 오류 메시지:', error.message);
    console.error('- 요청 URL:', url);
    console.error('- 전체 오류:', error);
    
    // 네트워크 오류인 경우 추가 정보
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      console.error('네트워크 연결 실패 가능 원인:');
      console.error('1. 서버가 실행 중이지 않음');
      console.error('2. CORS 설정 문제');
      console.error('3. Android 네트워크 보안 정책 (network_security_config.xml 필요)');
      console.error('4. 인터넷 권한 없음 (AndroidManifest.xml 확인)');
    }
    
    throw error;
  }
}

/**
 * JSON 응답을 포함한 API 호출
 * @param {string} endpoint - API 엔드포인트
 * @param {object} options - fetch 옵션
 * @returns {Promise<object>}
 */
async function apiJson(endpoint, options = {}) {
  const response = await apiFetch(endpoint, options);
  
  // Content-Type 확인
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  
  if (!isJson) {
    // JSON이 아닌 경우 텍스트로 읽기
    const text = await response.text();
    console.error('서버가 JSON이 아닌 응답을 반환했습니다.');
    console.error('Content-Type:', contentType);
    console.error('응답 내용 (처음 500자):', text.substring(0, 500));
    console.error('요청 URL:', response.url);
    throw new Error('서버 연결 오류: 서버가 JSON 응답을 반환하지 않았습니다. HTML 페이지가 반환되었습니다.');
  }
  
  // JSON 파싱
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || '요청을 처리할 수 없습니다.');
  }
  
  return data;
}

// 전역으로 사용할 수 있도록 export
if (typeof window !== 'undefined') {
  window.apiConfig = {
    baseUrl: API_BASE_URL,
    fetch: apiFetch,
    json: apiJson,
    isCapacitor,
  };
  console.log('api-config.js 초기화 완료');
  console.log('API_BASE_URL:', API_BASE_URL);
  console.log('window.apiConfig:', window.apiConfig);
}

// 모듈로도 export (필요한 경우)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    API_BASE_URL,
    apiFetch,
    apiJson,
    isCapacitor,
  };
}

