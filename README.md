# NestJS Microservices 모노레포

이벤트/보상 관리 플랫폼을 위한 NestJS 기반 MSA(Gateway, Auth, Event) 아키텍처 백엔드 API

## 프로젝트 구조

```
nexon-assignments/
├── apps/                    # 마이크로서비스 애플리케이션
│   ├── gateway/             # API Gateway 서비스 (포트: 3000)
│   ├── auth/                # 인증 서비스 (포트: 3001)
│   └── event/               # 이벤트 관리 서비스 (포트: 3002)
└── libs/                    # 공유 라이브러리
    └── common/              # 공통 모듈
```

## 기술 스택

- **런타임 & 언어**: Node.js 18, TypeScript
- **프레임워크**: NestJS 11
- **데이터베이스**: MongoDB + Mongoose
- **캐시·RBAC**: Redis (access token, 역할별 엔드포인트 캐시)
- **인증**: Passport.js + JWT

## 설치 및 실행

### 요구사항

- Node.js 18
- npm 또는 yarn
- MongoDB (선택적)
- Redis (선택적)

### 설치

```bash
$ npm install
```

### 실행 방법

```bash
# 전체 서비스 빌드
$ npm run build:all

# 개발 모드로 모든 서비스 동시 실행
$ npm run start:all:dev

# 개별 서비스 실행 (개발 모드)
$ npm run start:gateway:dev  # Gateway 서비스
$ npm run start:auth:dev     # Auth 서비스
$ npm run start:event:dev    # Event 서비스

# 프로덕션 모드 실행
$ npm run start:gateway:prod # Gateway 서비스
$ npm run start:auth:prod    # Auth 서비스
$ npm run start:event:prod   # Event 서비스
```

## 테스트

```bash
# 단위 테스트
$ npm run test

# 테스트 커버리지
$ npm run test:cov

# e2e 테스트
$ npm run test:e2e
```

## 주요 기능

### Gateway
- 모든 요청을 받아 라우팅
- 역할 기반 Account, Authorization, Authentication 구현 (RBAC)

### Auth
- 유저 등록 / 로그인 / 역할 관리
- JWT 발급 및 관리

### Event
- 이벤트 및 보상 관리
- 유저 보상 요청 및 검증
- 보상 요청 내역 조회
