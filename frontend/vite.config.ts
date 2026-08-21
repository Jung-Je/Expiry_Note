// `vitest/config`의 defineConfig는 Vite 설정 타입에 `test` 필드를 얹은
// 것이라, 여기서 vitest 설정(test.environment 등)도 같이 타입 체크된다.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 환경 변수 파일은 Vite 기본 위치(프로젝트 루트의 .env/.env.local) 대신
  // .envs/ 아래에 둔다. .env.dev, .env.prod 둘 다 커밋되지 않으므로 필요한
  // 키는 README.md를 참고. package.json 스크립트의 `--mode dev` /
  // `--mode prod` 플래그와 짝을 이뤄, Vite가 각각 .envs/.env.dev와
  // .envs/.env.prod를 읽도록 한다.
  envDir: './.envs',
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
  },
})
