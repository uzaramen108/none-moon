// PDF.js 워커 경로 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let papersDatabase = [];
let selectedPaper = null;
let currentPdfDocument = null; 
let currentPageNumber = 1;

// DOM 캐싱
const sidebarEl = document.getElementById("sidebar");
const summaryEl = document.getElementById("summary-container");
const mobileBackdrop = document.getElementById("mobile-backdrop");
const paperListContainer = document.getElementById("paper-list");
const paperCountBadge = document.getElementById("paper-count");
const viewerTitleDisplay = document.getElementById("viewer-title");
const pdfDownloadLink = document.getElementById("pdf-download-link");
const pdfCanvas = document.getElementById("pdf-render-canvas"); 
const pdfCtx = pdfCanvas.getContext('2d');

const textLayerDiv = document.createElement("div");
textLayerDiv.className = "textLayer";
pdfCanvas.parentNode.insertBefore(textLayerDiv, pdfCanvas.nextSibling);

const viewerPlaceholderElement = document.getElementById("viewer-placeholder");
const viewerControlsPanel = document.getElementById("viewer-controls");
const pageNumberIndicator = document.getElementById("page-number-indicator");
const btnPrevPage = document.getElementById("btn-prev");
const btnNextPage = document.getElementById("btn-next");
const summaryDisplayPre = document.getElementById("summary-display");
const summaryPlaceholderElement = document.getElementById("summary-placeholder");
const btnCopySummary = document.getElementById("btn-copy");
const btnToggleSidebar = document.getElementById("btn-toggle-sidebar");

// ==========================================
// 🛠️ 디버깅 시스템 구동
// ==========================================
console.log("==================================================");
console.log("🚀 [SYSTEM] 대시보드 스크립트 실행 시작!");
console.log(`🌐 [SYSTEM] 현재 브라우저 URL: ${window.location.href}`);
console.log("==================================================");

// Github Pages 호환성 확보를 위한 Base URL 추출 함수
function getBaseUrl() {
    let url = window.location.pathname;
    if (url.endsWith('index.html')) {
        url = url.slice(0, -10);
    }
    if (!url.endsWith('/')) {
        url += '/';
    }
    return url;
}

const BASE_URL = getBaseUrl();
console.log(`💡 [CONFIG] 계산된 Base URL: '${BASE_URL}'`);

async function buildPapersDatabase() {
    console.log("📂 [FETCH] papers.json 로딩 시도...");
    
    // 절대 경로 비스무리하게 만들어서 배포 환경에서도 작동하게 함
    const jsonPath = `${BASE_URL}papers.json`;
    console.log(`- 요청 경로: ${jsonPath}`);

    try {
        const response = await fetch(jsonPath);
        console.log(`- 응답 상태: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            throw new Error(`papers.json을 찾을 수 없습니다. (상태 코드: ${response.status})`);
        }
        
        const fetchedFiles = await response.json();
        console.log(`✅ [FETCH SUCCESS] 성공적으로 파싱된 논문 개수: ${fetchedFiles.length}개`);
        console.log("첫 번째 논문 샘플:", fetchedFiles[0]);

        papersDatabase = fetchedFiles.map(filename => ({
            filename: filename,
            displayName: filename 
        }));

        initializeDashboard();

    } catch (error) {
        console.error("❌ [FETCH ERROR] 논문 목록 로드 실패:", error);
        viewerPlaceholderElement.innerHTML = `
            <p style="color:#ef4444; font-weight:bold;">⚠️ 논문 목록을 불러오지 못했습니다.</p>
            <p style="font-size:0.85em; text-align:left; background:#fee2e2; padding:10px; border-radius:5px;">
                <b>에러 로그:</b> ${error.message}<br>
                <b>시도한 경로:</b> ${jsonPath}
            </p>
        `;
    }
}

function initializeDashboard() {
    console.log("🛠️ [INIT] 대시보드 UI 초기화 시작");
    
    paperCountBadge.textContent = `${papersDatabase.length} Papers`;

    papersDatabase.forEach((paper, index) => {
        const itemLayout = document.createElement("li");
        itemLayout.className = "paper-item";
        itemLayout.dataset.filename = paper.filename;
        itemLayout.innerHTML = `<span class="paper-meta">DOCUMENT ${String(index + 1).padStart(2, '0')}</span><span class="paper-title">${paper.displayName}</span>`;
        itemLayout.addEventListener("click", () => handlePaperSelection(paper.filename));
        paperListContainer.appendChild(itemLayout);
    });

    btnPrevPage.addEventListener("click", handlePreviousPageAction);
    btnNextPage.addEventListener("click", handleNextPageAction);
    btnCopySummary.addEventListener("click", handleSummaryClipboardCopy);
    mobileBackdrop.addEventListener("click", closeAllMobilePanels);
    
    btnToggleSidebar.addEventListener("click", () => {
        if (window.innerWidth > 768) {
            sidebarEl.classList.toggle("collapsed");
            if (currentPdfDocument) setTimeout(() => renderPage(currentPageNumber), 300); 
        } else {
            sidebarEl.classList.add("open");
            mobileBackdrop.classList.add("active");
        }
    });

    window.addEventListener('resize', () => {
        if (currentPdfDocument && window.innerWidth > 768) {
            setTimeout(() => renderPage(currentPageNumber), 300); 
        }
    });
    
    console.log("✅ [INIT] 사이드바 메뉴 렌더링 및 이벤트 바인딩 완료");
}

function handlePaperSelection(filename) {
    console.groupCollapsed(`▶️ [ACTION] 논문 클릭됨: ${filename.substring(0, 30)}...`);
    
    selectedPaper = papersDatabase.find(p => p.filename === filename);
    currentPageNumber = 1;
    currentPdfDocument = null;

    document.querySelectorAll(".paper-item").forEach(item => item.dataset.filename === filename ? item.classList.add("active") : item.classList.remove("active"));

    viewerTitleDisplay.textContent = selectedPaper.displayName;
    
    // 경로 최적화
    const pdfUrl = `${BASE_URL}src/resources/${selectedPaper.filename}.pdf`;
    console.log(`- 설정된 PDF 다운로드/렌더링 경로: ${pdfUrl}`);
    
    pdfDownloadLink.style.display = "inline-flex";
    pdfDownloadLink.href = pdfUrl;
    
    viewerControlsPanel.style.display = "flex";
    btnCopySummary.style.display = "block";

    viewerPlaceholderElement.style.display = "block";
    viewerPlaceholderElement.innerHTML = "<p>⏳ 문서를 렌더링하는 중입니다...</p>";
    pdfCanvas.style.display = "none";
    textLayerDiv.style.display = "none"; 

    fetchSummaryTextContent(selectedPaper.filename);
    loadPDFDocument(pdfUrl);

    if (window.innerWidth <= 768) closeAllMobilePanels();
    console.groupEnd();
}

function loadPDFDocument(url) {
    console.log(`📄 [PDF] 로드 시도: ${url}`);
    
    pdfjsLib.getDocument(url).promise.then(pdfDoc => {
        console.log(`✅ [PDF SUCCESS] 로드 성공! 총 페이지 수: ${pdfDoc.numPages}`);
        currentPdfDocument = pdfDoc;
        selectedPaper.totalPages = pdfDoc.numPages; 
        renderPage(currentPageNumber);
    }).catch(err => {
        console.error(`❌ [PDF ERROR] 로드 실패:`, err);
        viewerPlaceholderElement.innerHTML = `
            <p style="color:#ef4444; font-weight:bold;">⚠️ PDF 문서를 불러올 수 없습니다.</p>
            <p style="font-size:0.85em; text-align:left; background:#fee2e2; padding:10px; border-radius:5px;">
                <b>에러 내용:</b> ${err.message}<br>
                <b>요청 경로:</b> ${url}
            </p>
        `;
    });
}

function renderPage(num) {
    console.log(`🖼️ [RENDER] PDF ${num}페이지 렌더링 시작...`);
    viewerPlaceholderElement.style.display = "none";
    pdfCanvas.style.display = "block";
    textLayerDiv.style.display = "block";

    currentPdfDocument.getPage(num).then(page => {
        const viewportContainer = document.querySelector('.image-viewport');
        const containerWidth = viewportContainer.clientWidth - 48; 
        
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        let scale = containerWidth / unscaledViewport.width;
        if (scale < 1.0) scale = 1.2; 

        console.log(`- 렌더링 스케일: ${scale.toFixed(2)}배 (컨테이너 너비: ${containerWidth}px)`);

        const viewport = page.getViewport({ scale: scale });
        
        pdfCanvas.height = viewport.height;
        pdfCanvas.width = viewport.width;

        textLayerDiv.style.width = `${viewport.width}px`;
        textLayerDiv.style.height = `${viewport.height}px`;
        textLayerDiv.style.left = `${pdfCanvas.offsetLeft}px`;
        textLayerDiv.style.top = `${pdfCanvas.offsetTop}px`;
        textLayerDiv.innerHTML = ''; 

        const renderContext = { canvasContext: pdfCtx, viewport: viewport };
        const renderTask = page.render(renderContext);
        
        renderTask.promise.then(() => page.getTextContent()).then(textContent => {
            console.log(`- 텍스트 레이어 생성 완료 (길이: ${textContent.items.length})`);
            pdfjsLib.renderTextLayer({
                textContent: textContent,
                container: textLayerDiv,
                viewport: viewport,
                textDivs: []
            });
        });
    });

    pageNumberIndicator.textContent = `${num} / ${selectedPaper.totalPages}`;
    btnPrevPage.disabled = (num === 1);
    btnNextPage.disabled = (num === selectedPaper.totalPages);
}

function fetchSummaryTextContent(filename) {
    console.log(`📄 [TXT] 요약본 로드 시도...`);
    summaryPlaceholderElement.style.display = "none";
    summaryDisplayPre.style.display = "block";
    summaryDisplayPre.textContent = "요약 로딩 중...";
    
    const txtUrl = `${BASE_URL}src/resources/${filename}.txt`;
    console.log(`- 요청 경로: ${txtUrl}`);

    fetch(txtUrl)
        .then(res => {
            console.log(`- 요약본 응답 상태: ${res.status}`);
            if (!res.ok) throw new Error(res.status); 
            return res.text(); 
        })
        .then(data => { 
            console.log(`✅ [TXT SUCCESS] 텍스트 로드 성공 (길이: ${data.length}자)`);
            summaryDisplayPre.textContent = data; 
        })
        .catch(err => { 
            console.error(`❌ [TXT ERROR] 요약본 로드 실패:`, err);
            summaryDisplayPre.textContent = `⚠️ 요약본 텍스트(.txt) 파일을 찾을 수 없습니다.\n경로: ${txtUrl}`; 
        });
}

function handleSummaryClipboardCopy() {
    const textBuffer = summaryDisplayPre.textContent;
    if (!textBuffer || textBuffer.startsWith("요약") || textBuffer.startsWith("⚠️")) return;
    navigator.clipboard.writeText(textBuffer).then(() => {
        const preservedText = btnCopySummary.textContent;
        btnCopySummary.textContent = "복사 완료! ✔️";
        setTimeout(() => { btnCopySummary.textContent = preservedText; }, 1200);
    });
}

function handlePreviousPageAction() { if (currentPageNumber > 1) { currentPageNumber--; renderPage(currentPageNumber); } }
function handleNextPageAction() { if (currentPageNumber < selectedPaper.totalPages) { currentPageNumber++; renderPage(currentPageNumber); } }

let touchStartX = 0; let touchEndX = 0; const SWIPE_THRESHOLD = 60; let isSwipeAllowed = true;
document.addEventListener('touchstart', e => {
    if (e.touches.length > 1 || (window.visualViewport && window.visualViewport.scale > 1.05)) { isSwipeAllowed = false; return; }
    isSwipeAllowed = true; touchStartX = e.changedTouches[0].screenX;
}, { passive: true });
document.addEventListener('touchmove', e => { if (e.touches.length > 1) isSwipeAllowed = false; }, { passive: true });
document.addEventListener('touchend', e => {
    if (!isSwipeAllowed) return;
    touchEndX = e.changedTouches[0].screenX;
    if (window.innerWidth > 768) return;
    const dist = touchEndX - touchStartX;
    if (dist > SWIPE_THRESHOLD) summaryEl.classList.contains('open') ? (summaryEl.classList.remove('open'), mobileBackdrop.classList.remove('active')) : (sidebarEl.classList.add('open'), mobileBackdrop.classList.add('active'));
    else if (dist < -SWIPE_THRESHOLD) sidebarEl.classList.contains('open') ? (sidebarEl.classList.remove('open'), mobileBackdrop.classList.remove('active')) : (selectedPaper && (summaryEl.classList.add('open'), mobileBackdrop.classList.add('active')));
}, { passive: true });

function closeAllMobilePanels() { sidebarEl.classList.remove('open'); summaryEl.classList.remove('open'); mobileBackdrop.classList.remove('active'); }

buildPapersDatabase();