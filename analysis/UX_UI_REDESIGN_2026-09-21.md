# 단꿈 UX/UI 전면 개편 — 로컬 테스트 기록

작성일: 2026-09-21  
작업 브랜치: `codex/ui-ux-local-test-20260921`  
복구 태그: `local-uiux-checkpoint-20260921` (`07f3d3f`)

이 문서는 단꿈의 기능과 데이터 흐름은 유지하면서, 처음 쓰는 사용자가 서비스 구조를 이해하고 주요 행동을 더 쉽게 완료하도록 만든 로컬 UX/UI 실험의 근거와 범위를 기록한다.

## 제품의 핵심 사용자 과업

단꿈의 기능을 화면 이름이 아닌 사용자의 목적 기준으로 다시 정리했다.

1. 기억나는 사람을 찾고 싶다 → 구름 띄우기
2. 누군가 나를 찾는지 알고 싶다 → 구름 확인하기
3. 공개된 구름을 둘러보고 친구에게 알려주고 싶다 → 오늘의 구름
4. 내가 띄우거나 확인한 구름의 상태를 알고 싶다 → 내 구름
5. 과거 활동을 날짜별로 보고 싶다 → 기록
6. 서로 동의한 연결에서 대화하고 싶다 → 채팅

브랜드 용어는 없애지 않고, 사용자의 목적을 먼저 제시한 뒤 설명에서 구름 용어를 학습하도록 했다.

## 적용한 연구와 이론

### 1. Nielsen의 10가지 사용성 휴리스틱

- 시스템 상태 가시성: 진행 단계를 `2단계 / 총 3단계`처럼 명시한다.
- 현실 세계와의 일치: `응답`, `구름 찾아주기`처럼 해석이 필요한 용어를 `내 구름`, `오늘의 구름`처럼 목적 중심으로 보완한다.
- 사용자 통제와 자유: 이전·홈·삭제·차단·신고 경로를 숨기지 않는다.
- 일관성: 제목, 보조 설명, 입력 라벨, 주·보조 버튼의 위치와 표현을 통일한다.
- 오류 예방: 필수 여부와 입력 예시를 입력 전에 보여준다.
- 기억보다 인식: 홈에서 가능한 행동과 단꿈의 작동 방식을 직접 노출한다.
- 심미적·미니멀 디자인: 동시에 강하게 강조되는 요소를 한 화면당 하나로 제한한다.

출처: Jakob Nielsen, *10 Usability Heuristics for User Interface Design*  
https://www.nngroup.com/articles/ten-usability-heuristics/

### 2. Hick–Hyman 법칙과 점진적 공개

선택지가 많고 의미 차이가 불분명하면 판단 시간이 증가한다. 홈에서는 네 종류의 방을 바로 펼치지 않고, 먼저 `찾기 / 확인하기 / 둘러보기` 세 가지 상위 과업만 보여준다. 방 종류는 다음 화면에서 설명과 함께 선택한다.

- Hick, W. E. (1952), *On the rate of gain of information*, DOI: 10.1080/17470215208416600
- Hyman, R. (1953), *Stimulus information as a determinant of reaction time*, DOI: 10.1037/h0056940

### 3. Fitts의 법칙과 모바일 터치

중요한 조작은 충분히 크고, 관련 콘텐츠 가까이에 있어야 한다. 버튼·탭·아이콘의 최소 높이를 44px 이상으로 맞추고, 옵션 버튼을 두 열의 큰 표적으로 통일했다.

- Fitts, P. M. (1954), *The information capacity of the human motor system in controlling the amplitude of movement*, DOI: 10.1037/h0055392
- Apple Human Interface Guidelines, UI Design Dos and Don'ts  
  https://developer.apple.com/design/tips/

### 4. 인지 부하와 질문 화면

한 화면에서 사용자가 처리해야 할 질문 범위를 제한하고, 필드마다 지속적으로 보이는 라벨을 제공했다. placeholder만으로 의미를 전달하지 않는다. 선택한 정보는 요약 박스에서 다시 확인할 수 있게 유지했다.

- Sweller, J. (1988), *Cognitive load during problem solving*, DOI: 10.1207/s15516709cog1202_4
- GOV.UK Design System, *Question pages*  
  https://design-system.service.gov.uk/patterns/question-pages/
- GOV.UK Design System, *Recover from validation errors*  
  https://design-system.service.gov.uk/patterns/validation/

### 5. 사회적 투명성과 온라인 커뮤니티 설계

커뮤니티에서는 활동 자체보다 `누가 참여할 수 있는지`, `어떤 행동이 다른 사람에게 보이는지`, `문제가 생겼을 때 무엇을 할 수 있는지`가 신뢰에 중요하다. 홈에 학생 인증, 상호 동의, 신고·차단·삭제 규칙을 짧고 명확하게 노출했다.

- Erickson & Kellogg (2000), *Social Translucence: An Approach to Designing Systems that Support Social Processes*, DOI: 10.1145/344949.345004
- Kraut & Resnick (2012), *Building Successful Online Communities: Evidence-Based Social Design*  
  https://kraut.hciresearch.info/books/
- Burke, Marlow & Lento (2009), *Feed Me: Motivating Newcomer Contribution in Social Networking Sites*, DOI: 10.1145/1518701.1518847

### 6. 접근성 기준

- 일반 텍스트 대비는 WCAG AA의 4.5:1을 목표로 한다.
- 색만으로 선택 상태를 구분하지 않고 테두리·배경·텍스트를 함께 바꾼다.
- 키보드 포커스에는 3px의 고대비 표시를 제공한다.
- 하단 내비게이션 때문에 포커스 요소가 가려지지 않도록 본문 하단 여백을 둔다.
- `prefers-reduced-motion`에서 애니메이션을 사실상 제거한다.

출처: W3C, *Web Content Accessibility Guidelines 2.2*  
https://www.w3.org/TR/WCAG22/

## 이번 로컬 변경 범위

- 홈을 사용자의 세 가지 핵심 과업 중심으로 재배치
- 첫 사용자를 위한 3단계 작동 방식 설명 추가
- 커뮤니티 안전·책임 장치를 읽기 쉬운 목록으로 변경
- 네 종류 구름방의 역할과 선택 화면 위계 통일
- 작성·확인 단계 표시를 자연어로 변경
- 프로필 입력란에 영구 라벨·필수 표시·공개 조건 설명 추가
- 하단 메뉴를 `홈 / 내 구름 / 기록 / 채팅 / 프로필`로 명확화
- 배경·표면·본문·보조 글자·경계·상태 색상을 디자인 토큰으로 통합
- 터치 영역, 포커스 표시, 텍스트 대비, 줄간격 개선
- 게시글·알림·응답·선택 카드의 형태와 상태 표현 통일
- 한국어로 새로 추가한 주요 문구에 영어 번역 추가

## 되돌리기

이번 실험은 `src/ux-overhaul.css`가 마지막에 불러와지는 독립 레이어로 구성했다. 스타일 실험만 제거하려면 해당 import와 파일을 제거하면 된다.

전체 작업을 버리려면 원본 브랜치로 돌아간다.

```bash
git switch main
```

원본 커밋을 직접 확인하려면 로컬 태그를 사용한다.

```bash
git show local-uiux-checkpoint-20260921
```

이 브랜치와 태그는 로컬에만 있으며 원격 저장소로 푸시하지 않는다.

