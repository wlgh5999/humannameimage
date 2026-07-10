# 교육 제목 이미지 생성기

휴먼임팩트협동조합 교육 홍보물에 바로 얹어 쓸 수 있는 제목 이미지와 아이콘 투명 PNG를 생성하는 Next.js 웹앱입니다.

## 생성 흐름

1. 사용자가 교육명, 홍보 문구, 핵심 주제, 대상자를 입력합니다.
2. `제목 시안 2안 생성하기`를 누르면 꾸민 제목 투명 PNG 2안을 동시에 병렬 생성합니다.
3. 사용자가 `1안 선택` 또는 `2안 선택`을 누릅니다.
4. 선택한 꾸민 제목 PNG를 입력 이미지로 사용해 `제목만 PNG`와 `아이콘만 PNG`를 동시에 병렬 편집합니다.
5. 최종 3종을 개별 PNG 또는 ZIP으로 다운로드합니다.

## 최종 결과물

1. `꾸민 제목 투명 PNG`
2. `제목만 투명 PNG`
3. `아이콘만 투명 PNG`

ZIP 내부 파일명:

```text
01_꾸민제목_선택안.png
02_제목만_투명.png
03_아이콘만_투명.png
```

## 디자인 일관성

앱은 선택된 꾸민 제목 PNG의 내부 `designSpec`과 실제 `imageDataUrl`을 함께 마스터로 사용합니다.

선택 이후 생성되는 `제목만 PNG`와 `아이콘만 PNG`는 새 랜덤 스타일로 독립 생성하지 않습니다. 선택한 꾸민 제목 이미지를 OpenAI 이미지 편집 입력으로 전달하고, 동일한 팔레트, 타이포그래피 방향, 줄바꿈 계획, 장식 목록을 공유합니다.

서버는 `제목만 PNG` 또는 `아이콘만 PNG` 요청에 입력 이미지가 없으면 요청을 거절합니다.

## 속도 최적화 원칙

- 모든 이미지 생성과 편집은 `quality="high"`만 사용합니다.
- `medium` 또는 `low` 품질로 낮춰 속도를 줄이지 않습니다.
- 1안/2안 꾸민 제목 이미지는 `Promise.all`로 병렬 생성합니다.
- 사용자가 시안을 선택하기 전에는 제목만/아이콘만 PNG를 미리 만들지 않습니다.
- 선택 후 제목만/아이콘만 PNG는 선택한 꾸민 제목 이미지를 입력 이미지로 사용해 병렬 편집합니다.
- UI에 단계별 진행 상태와 처리 시간을 표시합니다.

## 출력 크기

최종 PNG는 선택한 크기에 맞춰 서버에서 리사이즈하고 300dpi PNG 메타데이터를 넣습니다.

- `1500 x 730`
- `1500 x 416`
- `1500 x 1500`

## 인증

사이트 접속 시 팀 전용 비밀번호를 입력해야 합니다.

- 비밀번호는 클라이언트 코드에 포함하지 않습니다.
- 서버 환경변수 `SITE_PASSWORD`로만 검증합니다.
- 클라이언트 화면에서는 비밀번호 형식이나 길이를 공개하지 않습니다.
- 인증 쿠키 이름은 `hi_site_auth`입니다.
- 인증 없이 생성 API를 직접 호출하면 `401 Unauthorized`가 반환됩니다.

## 환경변수

`.env.local` 또는 Vercel 환경변수에 아래 값을 설정합니다.

```bash
OPENAI_API_KEY=sk-...
SITE_PASSWORD=your-site-password
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
  - 입력된 비밀번호와 서버 환경변수 `SITE_PASSWORD`를 비교하고 인증 쿠키를 발급합니다.

- `POST /api/auth/logout`
  - 인증 쿠키를 제거합니다.

- `POST /api/generate-candidates`
  - 꾸민 제목 투명 PNG 1안/2안용 프롬프트 세트를 생성합니다.

- `POST /api/generate-prompt-set`
  - 이전 호환용 API입니다. 단일 디자인 스펙과 3개 출력 프롬프트를 생성합니다.

- `POST /api/generate-image`
  - 꾸민 제목은 OpenAI 이미지 생성 API를 호출합니다.
  - 제목만/아이콘만 PNG는 선택한 꾸민 제목 이미지를 입력으로 OpenAI 이미지 편집 API를 호출합니다.
  - 모든 요청은 `quality="high"`만 허용합니다.
  - 응답 전 서버에서 흰 배경 제거, 정확한 크기 리사이즈, 300dpi 처리를 수행합니다.

- `POST /api/make-transparent`
  - 후처리 확장을 위한 API입니다.

## 배포

Vercel 배포 시 Project Settings > Environment Variables에 아래 값을 추가합니다.

```text
OPENAI_API_KEY
SITE_PASSWORD
```

배포 명령:

```bash
vercel --prod
```
