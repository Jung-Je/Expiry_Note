// 카카오 로그인은 JS SDK로 인가 코드(code)만 받고, 그 코드를 access_token
// 으로 교환하는 건 반드시 백엔드에서 한다 — client_secret이 필요할 수
// 있는데 그건 브라우저로 넘기면 안 되는 값이라서다(features/auth/api.ts의
// kakaoLogin 참고).
declare global {
  interface Window {
    Kakao?: {
      init: (jsKey: string) => void
      isInitialized: () => boolean
      Auth: {
        authorize: (options: { redirectUri: string }) => void
      }
    }
  }
}

const KAKAO_SDK_SRC = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.2/kakao.min.js'

let sdkPromise: Promise<void> | null = null

function loadKakaoSdk(): Promise<void> {
  sdkPromise ??= new Promise((resolve, reject) => {
    if (window.Kakao) {
      resolve(undefined)
      return
    }
    const script = document.createElement('script')
    script.src = KAKAO_SDK_SRC
    script.crossOrigin = 'anonymous'
    script.onload = () => resolve(undefined)
    script.onerror = () => reject(new Error('카카오 SDK를 불러오지 못했습니다.'))
    document.head.appendChild(script)
  }).then(() => {
    const jsKey = import.meta.env.VITE_KAKAO_JS_KEY
    if (!jsKey) {
      throw new Error('VITE_KAKAO_JS_KEY가 설정되어 있지 않습니다.')
    }
    if (!window.Kakao?.isInitialized()) {
      window.Kakao?.init(jsKey)
    }
  })
  return sdkPromise
}

export function getKakaoRedirectUri(): string {
  return `${window.location.origin}/auth/kakao/callback`
}

export async function startKakaoLogin(): Promise<void> {
  await loadKakaoSdk()
  // 성공하면 카카오 동의 화면으로 페이지 전체가 리다이렉트되므로 이 함수는
  // 정상적으로는 반환되지 않는다.
  window.Kakao?.Auth.authorize({ redirectUri: getKakaoRedirectUri() })
}
