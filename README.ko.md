# McCabe-Thiele Method Online

_&check;_ _Korean(한국어)_ | [_English_](README.md)

**McCabe-Thiele Method Online**은 화학공학을 전공하고 있는 학부생이 만든 웹사이트로, 화학공학 전공 학생과 전문가가 이성분계 증류 공정을 시각화하는 데 도움이 되도록 설계된 웹 기반 시뮬레이션 도구입니다. McCabe-Thiele 다이어그램의 그래픽 구성을 자동화하여 이론적인 단 수, 최소 환류비, 그리고 최적의 공급 위치를 결정합니다. 추후 업데이트를 통하여 다른 화학공정에 대한 도구를 제공할 예정입니다.

다음 링크를 통해 사이트를 이용하실 수 있습니다: https://uzaramen108.github.io/McCabe-Thiele-method-online/

<img width="1423" height="1261" alt="image" src="https://github.com/user-attachments/assets/01f62700-90f2-4675-bb45-4baf559622f7" />

## 사용된 기술

이 프로젝트는 복잡한 서버 측 인프라 없이도 인터랙티브 엔지니어링 도구를 제공하기 위해 최신 웹 스택을 활용합니다.

- **[Chart.js](https://www.chartjs.org/):**
- HTML5 Canvas에서 McCabe-Thiele 다이어그램을 렌더링하는 핵심 시각화 엔진으로 사용됩니다.
- 평형 곡선, 작동선(정류/제거), q-선 및 단계별 구성의 정확한 플롯을 처리합니다.

- **[Supabase](https://supabase.com/) (PostgreSQL):**
- 증기-액체 평형(VLE) 시스템 데이터를 저장하는 백엔드 데이터베이스 역할을 합니다.
- 애플리케이션이 모든 사용자가 접근하고 기여할 수 있는 화학 시스템의 공유되고 영구적인 라이브러리를 유지할 수 있도록 합니다.

- **LocalStorage(웹 API):**
- 데이터 삭제 소유권 관리 시스템을 구현합니다.
- 애플리케이션은 전체 인증 시스템 대신 사용자가 생성한 데이터의 고유 ID를 브라우저의 LocalStorage에 저장합니다. 이를 통해 생성자는 플랫폼을 개방적이고 접근 가능하게 유지하면서 자신의 데이터에 대한 "삭제 권한"을 부여할 수 있습니다.

- **Webpack:**
- 최적화된 프로덕션 배포를 위해 JavaScript 모듈과 에셋을 번들로 제공합니다.
