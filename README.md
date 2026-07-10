# 제목 생성기

휴먼임팩트협동조합 교육 홍보물에 바로 얹어 쓸 수 있는 제목 이미지 생성 웹앱입니다.

교육명, 홍보문구, 핵심주제, 대상자를 입력하면 같은 디자인 스펙을 공유하는 투명 PNG 3종을 생성합니다.

## 생성 결과물

1. `꾸민 제목 투명 PNG`
   - 제목과 작은 장식 요소를 함께 포함한 대표 이미지
2. `제목만 투명 PNG`
   - 대표 이미지와 같은 서체, 색상, 줄바꿈, 배치를 유지한 제목 글씨만 이미지
3. `아이콘만 투명 PNG`
   - 대표 이미지와 같은 장식 요소만 분리한 이미지

각 이미지는 개별 PNG로 받을 수 있고, 3개 전체를 ZIP 파일로 받을 수도 있습니다.

## 출력 크기

최종 다운로드 PNG는 선택한 크기와 정확히 일치하도록 브라우저에서 리사이즈됩니다.

- `1500 × 730`
- `1500 × 416`
- `1500 × 1500`

OpenAI Image API가 해당 픽셀 크기를 직접 지원하지 않는 경우, 가까운 지원 크기로 먼저 생성한 뒤 최종 PNG를 선택 크기에 맞춥니다.

## 인증

사이트 접속 시 4자리 비밀번호를 입력해야 합니다.

- 비밀번호는 클라이언트 코드에 포함하지 않습니다.
- 서버 환경변수 `SITE_PASSWORD`로만 검증합니다.
- 인증 쿠키 이름은 `hi_site_auth`입니다.
- 쿠키는 `httpOnly`, `sameSite: lax`, production에서 `secure: true`, `maxAge: 1일`로 설정됩니다.
- 인증 없이 생성 API를 직접 호출하면 `401 Unauthorized`가 반환됩니다.

## 환경변수

`.env.local` 또는 Vercel 환경변수에 아래 값을 설정합니다.

```bash
OPENAI_API_KEY=sk-...
SITE_PASSWORD=1234
```

선택적으로 모델을 바꿀 수 있습니다.

```bash
OPENAI_TEXT_MODEL=gpt-4.1-mini
OPENAI_IMAGE_MODEL=gpt-image-2
```

주의: 실제 API 키와 실제 비밀번호를 코드나 GitHub 저장소에 직접 커밋하면 안 됩니다.

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 접속합니다.

```text
http://localhost:3000
```

## 주요 API

- `POST /api/auth/login`
  - 숫자 4자리 비밀번호를 검증하고 인증 쿠키를 발급합니다.

- `POST /api/auth/logout`
  - 인증 쿠키를 삭제합니다.

- `POST /api/generate-prompt-set`
  - 하나의 공유 디자인 스펙과 3개 출력용 프롬프트를 생성합니다.

- `POST /api/generate-image`
  - OpenAI Image API를 호출해 각 결과 이미지를 생성합니다.

- `POST /api/make-transparent`
  - 후처리 확장을 위한 API입니다. 현재 앱에서는 클라이언트에서 흰 배경 제거, 정확한 크기 리사이즈, 300dpi PNG 메타데이터 처리를 수행합니다.

## 3종 결과물 일관성 방식

현재 OpenAI 이미지 생성 API는 편집 가능한 레이어 파일을 직접 반환하지 않습니다. 그래서 이 앱은 먼저 하나의 `designSpec`을 생성해 아래 정보를 고정합니다.

- 제목 색상
- 제목 스타일
- 제목 줄바꿈
- 아이콘 색상
- 장식 스타일

그 다음 3개 결과물 프롬프트가 같은 `designSpec`을 공유하도록 생성합니다. 이 방식은 세 결과물이 같은 팔레트, 서체 방향, 장식 목록, 배치 규칙을 따르도록 강제합니다.

## 배포

Vercel에 배포할 때는 Project Settings > Environment Variables에 아래 값을 추가합니다.

```text
OPENAI_API_KEY
SITE_PASSWORD
```

배포 명령:

```bash
vercel --prod
```
