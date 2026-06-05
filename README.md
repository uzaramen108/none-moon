# none-moon (논-문)

**none-moon**은 졸업논문과 공모전에 시달리는 변방의 대학생이 만들었으며, 공모전에 사용될 논문을 저장하는 용도로 만들었습니다. 만들다보니 재밌어서 로그인, 요약본 수정, 관리 등등 기능을 넣었는데 AI 도움 이빠이 받고 아직 코드 리딩은 안해봄(ㅎㅎ ㅈㅅ;;). 곧 변수의 parameter 주석 달거나 해야하는데 시험기간이라 6월 말에야 할듯 하네요(ㅠ). 백엔드와 데이터베이스로는 Huggingface로 설계하였습니당. 코딩으로 로그인하는 사람의 IP 등의 정보를 얻을수도 있겠지만 굳이 소규모로 이용할건데 넣을 필요는 없을 것 같았고 이미 카카오&쿠팡으로 인해 개인정보 값은 휴지조각이 되었기에 알아봤자 뭐합니까(ㅠㅠ). 

이 사이트를 통하여 논문 뷰어 및 투고, 요약문 작성을 하실 수 있습니다: https://uzaramen108.github.io/second-environmental-safety-engineering-contest-papers/ko/

You can try the none-moon paper viewer, here: https://uzaramen108.github.io/second-environmental-safety-engineering-contest-papers/en/

이 사이트는 피카츄배구(https://gorisanson.github.io/pikachu-volleyball/ko/)의 코드 구조를 따랐습니다. 대한민국 역사상 최고의 게임, 피카츄배구 온라인 많은 사랑 부탁드립니다. Thanks to Kyutae Lee!

## Used Tech And Library

이 프로젝트는 웹페이지 내에서 pdf를 시각화 및 기능을 이용할 수 있도록 pdf.js와 백엔트로 Huggingface를 이용하였습니다. 

- **[pdf.js](https://mozilla.github.io/pdf.js/):**
  - Integrated as the core visualization engine to render academic PDF papers smoothly inside the web browser.
  - Leverages HTML5 Canvas to support high-performance text layer rendering, seamless page navigation, and responsive zooming/dragging functionalities.

- **[FastAPI](https://fastapi.tiangolo.com/) & [Uvicorn](https://www.uvicorn.org/):**
  - Utilized to build the platform's high-performance backend RESTful API architecture.
  - Employs asynchronous request handling to manage paper PDF uploads/deletions, summary text operations, and real-time user feedback (voting) data.

- **[Hugging Face Spaces](https://huggingface.co/spaces) & [Datasets](https://huggingface.co/datasets):**
  - Serves as a robust, zero-cost backend server infrastructure and permanent cloud database system.
  - Spaces functions as the primary API container server, while Datasets acts as a persistent DB warehouse that continuously tracks user credentials, paper metadata, and crowd-sourced summaries via automated Git commits and syncs.

- **LocalStorage (Web API):**
  - Used for efficient client-side session management and real-time frontend personalization.
  - Persists active login sessions and saves individual preferences—such as user-defined paper names, starred items, and masked documents—synchronizing them instantly across the core dashboard panels.

- **Webpack:**
  - Acts as the production bundler that compiles, minifies, and optimizes multi-entry JavaScript modules into a clean deployable release.