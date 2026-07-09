# 교육 홍보물 제목 투명 PNG 생성기

휴먼임팩트협동조합 교육 홍보물에 얹어 쓸 수 있는 생성형 제목/아이콘 PNG 웹앱입니다.

교육명, 홍보문구, 핵심주제, 대상자를 입력하면 앱이 사람중심·관계중심·현장실천 톤을 바탕으로 색상, 분위기, 서체 방향을 자동 추천하고 OpenAI Image API로 PNG 이미지를 생성합니다. API Key는 서버 환경변수에서만 읽으며 클라이언트에 노출하지 않습니다.

## 결과물 유형

1. 제목(글씨만) 투명 PNG
2. 어울리는 아이콘 등으로 꾸민 제목 투명 PNG
3. 어울리는 아이콘 투명 PNG 모음

세 결과물 모두 흰 배경 제거 후처리를 거쳐 투명 PNG로 보여주고 다운로드합니다. 다운로드 PNG에는 300dpi pHYs 메타데이터를 삽입합니다.

## 주요 기능

- 교육명, 홍보문구 입력
- 핵심주제 한 칸 입력: 줄바꿈으로 여러 항목을 한 번에 작성
- 대상자 한 칸 입력: 줄바꿈으로 여러 항목을 한 번에 작성
- 교육분야 선택 없이 내용 기반 자동 추천
- 휴먼임팩트 홈페이지와 첨부 썸네일 분위기를 반영한 색상/서체/장식 프롬프트
- 결과물 유형 3개만 제공
- 품질은 항상 `high`
- 기본 이미지 생성 모델은 `gpt-image-2`
- 투명 PNG 후처리와 300dpi 다운로드
- 생성 전 비용 확인 모달
- 오늘 생성 장수 localStorage 표시

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 아래 주소로 접속합니다.

```text
http://localhost:3000
```

## .env.local 설정

프로젝트 루트에 `.env.local` 파일을 만들고 OpenAI API Key를 입력합니다.

```bash
OPENAI_API_KEY=sk-your-api-key-here
```

선택적으로 모델을 바꿀 수 있습니다.

```bash
OPENAI_TEXT_MODEL=gpt-4.1-mini
OPENAI_IMAGE_MODEL=gpt-image-2
```

`OPENAI_IMAGE_MODEL`을 지정하지 않으면 앱은 기본 이미지 생성 모델로 `gpt-image-2`를 사용합니다.

## 투명 PNG와 300dpi 참고

OpenAI Image API는 모델에 따라 `background: "transparent"` 지원 여부가 다릅니다. 이 앱은 기본 모델을 `gpt-image-2`로 두고, 모든 결과물을 흰 배경 위에 생성하도록 프롬프트를 만든 뒤 클라이언트에서 흰 배경을 투명 처리합니다.

다운로드 시 PNG의 pHYs 청크에 300dpi 정보를 추가합니다. 다만 생성 원본 픽셀 수 자체는 선택한 크기(`1536x1024`, `1024x1024`, `1024x1536`)를 따르므로, 더 큰 인쇄물이 필요하면 더 큰 이미지 크기 옵션을 추가하는 방식으로 확장하면 됩니다.

## API Route 구조

- `POST /api/generate-prompt`
  - 교육 정보를 분석해 이미지 생성 프롬프트와 팔레트를 만듭니다.
  - `OPENAI_API_KEY`가 없거나 OpenAI 프롬프트 생성이 실패하면 로컬 규칙 기반 프롬프트를 반환합니다.

- `POST /api/generate-image`
  - 서버의 `OPENAI_API_KEY`로 OpenAI Image API를 호출합니다.
  - 클라이언트에 API Key가 노출되지 않습니다.

- `POST /api/make-transparent`
  - 후처리 확장을 위한 구조입니다.
  - 현재 앱에서는 클라이언트에서 흰 배경 제거와 300dpi PNG 메타데이터 처리를 수행합니다.
