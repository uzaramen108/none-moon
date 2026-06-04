import '../style.css'; 

const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let papersDatabase = [];
let selectedPaper = null;
let currentPdfDocument = null; 
let currentPageNumber = 1;

// 💡 줌 및 드래그 상태 관리 변수
let currentZoom = 1.0; 
let zoomTimeout = null;
let isDragging = false;
let dragStartX, dragStartY, scrollLeftStart, scrollTopStart;

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
const viewportContainer = document.getElementById("viewport-container");
const pdfPaddingWrapper = document.getElementById("pdf-padding-wrapper");

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const BASE_URL = isLocal ? '/' : '/second-environmental-safety-engineering-contest-papers/';

async function buildPapersDatabase() {
    const jsonPath = `${BASE_URL}papers.json`;
    try {
        const response = await fetch(jsonPath);
        if (!response.ok) throw new Error(response.status);
        const fetchedFiles = await response.json();
        papersDatabase = fetchedFiles.map(filename => ({ filename, displayName: filename }));
        initializeDashboard();
    } catch (error) {
        viewerPlaceholderElement.innerHTML = `<p style="color:#ef4444; font-weight:bold;">⚠️ 논문 목록을 불러오지 못했습니다.</p>`;
    }
}

function initializeDashboard() {
    paperCountBadge.textContent = `${papersDatabase.length} Papers`;
    papersDatabase.forEach((paper, index) => {
        const itemLayout = document.createElement("li");
        itemLayout.className = "paper-item";
        itemLayout.dataset.filename = paper.filename;
        itemLayout.innerHTML = `<span class="paper-meta">DOCUMENT ${String(index + 1).padStart(2, '0')}</span><span class="paper-title">${paper.displayName}</span>`;
        itemLayout.addEventListener("click", () => handlePaperSelection(paper.filename));
        paperListContainer.appendChild(itemLayout);
    });

    if (btnPrevPage) btnPrevPage.addEventListener("click", handlePreviousPageAction);
    if (btnNextPage) btnNextPage.addEventListener("click", handleNextPageAction);
    if (btnCopySummary) btnCopySummary.addEventListener("click", handleSummaryClipboardCopy);
    if (mobileBackdrop) mobileBackdrop.addEventListener("click", closeAllMobilePanels);

    btnToggleSidebar.addEventListener("click", () => {
        if (window.innerWidth > 768) {
            sidebarEl.style.display = sidebarEl.style.display === "none" ? "block" : "none";
            if (currentPdfDocument) setTimeout(() => renderPage(currentPageNumber), 300); 
        } else {
            sidebarEl.classList.add("open");
            mobileBackdrop.classList.add("active");
        }
    });

    window.addEventListener('resize', () => {
        if (currentPdfDocument && window.innerWidth > 768) setTimeout(() => renderPage(currentPageNumber), 300); 
    });

    // ==========================================
    // 💡 마우스 휠 줌 기능 (100% ~ 300%)
    // ==========================================
    if (viewportContainer) {
        viewportContainer.addEventListener("wheel", (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault(); 
                currentZoom += e.deltaY < 0 ? 0.2 : -0.2;
                currentZoom = Math.max(1.0, Math.min(currentZoom, 3.0)); // 최소 1배, 최대 3배 고정
                
                viewportContainer.style.cursor = currentZoom > 1.0 ? 'grab' : 'default';

                clearTimeout(zoomTimeout);
                zoomTimeout = setTimeout(() => {
                    if (currentPdfDocument) renderPage(currentPageNumber);
                }, 100);
            }
        }, { passive: false });

        // ==========================================
        // 💡 마우스 드래그 이동 기능 (줌인 상태일 때만)
        // ==========================================
        // ==========================================
        // 💡 마우스 드래그 이동 vs 텍스트 긁기 완벽 분리
        // ==========================================
        viewportContainer.addEventListener('mousedown', (e) => {
            // 💡 핵심 수정: 투명판 전체가 아니라, 진짜 '글자(span)' 위에 있을 때만 긁기 모드로 진입
            if (e.target.tagName.toLowerCase() === 'span' && e.target.closest('.textLayer')) {
                isDragging = false;
                return;
            }

            // 여백이나 글자 사이 빈 공간을 클릭한 경우 -> 화면 이동 모드 시작
            if (currentZoom <= 1.0) return; 
            isDragging = true;
            
            // 이동 중에는 텍스트 레이어를 아예 투명 인간 취급해서 절대 안 긁히게 만듦
            viewportContainer.style.userSelect = 'none';
            if (textLayerDiv) textLayerDiv.style.pointerEvents = 'none';

            viewportContainer.style.cursor = 'grabbing';
            dragStartX = e.pageX - viewportContainer.offsetLeft;
            dragStartY = e.pageY - viewportContainer.offsetTop;
            scrollLeftStart = viewportContainer.scrollLeft;
            scrollTopStart = viewportContainer.scrollTop;
        });

        // 마우스 버튼을 떼거나 화면 밖으로 나가면 락 해제
        const endDrag = () => {
            if (isDragging) {
                isDragging = false;
                viewportContainer.style.cursor = currentZoom > 1.0 ? 'grab' : 'default';
                // 글자 긁기 락 해제 (다시 글자를 복사할 수 있게 복구)
                viewportContainer.style.userSelect = '';
                if (textLayerDiv) textLayerDiv.style.pointerEvents = '';
            }
        };

        viewportContainer.addEventListener('mouseleave', endDrag);
        viewportContainer.addEventListener('mouseup', endDrag);

        viewportContainer.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - viewportContainer.offsetLeft;
            const y = e.pageY - viewportContainer.offsetTop;
            viewportContainer.scrollLeft = scrollLeftStart - (x - dragStartX);
            viewportContainer.scrollTop = scrollTopStart - (y - dragStartY);
        });
    }
}

function handlePaperSelection(filename) {
    selectedPaper = papersDatabase.find(p => p.filename === filename);
    currentPageNumber = 1;
    currentPdfDocument = null;
    currentZoom = 1.0; // 논문 바뀔 때 줌 초기화
    if(viewportContainer) viewportContainer.style.cursor = 'default';

    document.querySelectorAll(".paper-item").forEach(item => item.dataset.filename === filename ? item.classList.add("active") : item.classList.remove("active"));
    if (viewerTitleDisplay) viewerTitleDisplay.textContent = selectedPaper.displayName;
    
    const pdfUrl = `${BASE_URL}resources/assets/papers/${selectedPaper.filename}.pdf`;
    
    if (summaryEl) summaryEl.style.display = "flex"; 
    if (pdfDownloadLink) { pdfDownloadLink.style.display = "inline-flex"; pdfDownloadLink.href = pdfUrl; }
    if (viewerControlsPanel) viewerControlsPanel.style.display = "flex";
    if (btnCopySummary) btnCopySummary.style.display = "block";

    if (viewerPlaceholderElement) viewerPlaceholderElement.style.display = "block";
    if (pdfCanvas) pdfCanvas.style.display = "none";
    if (textLayerDiv) textLayerDiv.style.display = "none"; 
    if (pdfPaddingWrapper) pdfPaddingWrapper.style.display = "none";

    fetchSummaryTextContent(selectedPaper.filename);
    loadPDFDocument(pdfUrl);

    if (window.innerWidth <= 768) closeAllMobilePanels();
}

function loadPDFDocument(url) {
    pdfjsLib.getDocument(url).promise.then(pdfDoc => {
        currentPdfDocument = pdfDoc;
        selectedPaper.totalPages = pdfDoc.numPages; 
        renderPage(currentPageNumber);
    }).catch(err => {
        if(viewerPlaceholderElement) viewerPlaceholderElement.innerHTML = `<p style="color:#ef4444; font-weight:bold;">⚠️ PDF 문서를 불러올 수 없습니다.</p>`;
    });
}

function renderPage(num) {
    if (viewerPlaceholderElement) viewerPlaceholderElement.style.display = "none";
    if (pdfPaddingWrapper) pdfPaddingWrapper.style.display = "inline-block";
    if (pdfCanvas) pdfCanvas.style.display = "block";
    if (textLayerDiv) textLayerDiv.style.display = "block";

    currentPdfDocument.getPage(num).then(page => {
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        
        // 💡 여백(상하 120px, 좌우 40px)을 뺀 순수 컨테이너 허용 공간
        const targetWidth = viewportContainer.clientWidth - 40;
        const targetHeight = viewportContainer.clientHeight - 120;
        
        // 가로, 세로 중 더 타이트한 쪽에 맞춰서 딱 맞는 100% 스케일 계산
        const scaleWidth = targetWidth / unscaledViewport.width;
        const scaleHeight = targetHeight / unscaledViewport.height;
        const baseScale = Math.min(scaleWidth, scaleHeight);

        // 💡 최종 배율 = 기본 딱맞는 배율 * 유저 줌 배율(1.0 ~ 3.0)
        const finalScale = baseScale * currentZoom;
        const viewport = page.getViewport({ scale: finalScale });
        
        const outputScale = window.devicePixelRatio || 1;
        const pdfWrapper = document.getElementById("pdf-wrapper");
        
        pdfCanvas.width = Math.floor(viewport.width * outputScale);
        pdfCanvas.height = Math.floor(viewport.height * outputScale);
        pdfCanvas.style.width = Math.floor(viewport.width) + "px";
        pdfCanvas.style.height = Math.floor(viewport.height) + "px";

        if (pdfWrapper) {
            pdfWrapper.style.width = Math.floor(viewport.width) + "px";
            pdfWrapper.style.height = Math.floor(viewport.height) + "px";
        }

        textLayerDiv.style.width = Math.floor(viewport.width) + "px";
        textLayerDiv.style.height = Math.floor(viewport.height) + "px";
        textLayerDiv.style.left = "0px";
        textLayerDiv.style.top = "0px";
        textLayerDiv.style.setProperty('--scale-factor', viewport.scale);
        textLayerDiv.innerHTML = ''; 

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;
        const renderContext = { canvasContext: pdfCtx, transform: transform, viewport: viewport };
        
        page.render(renderContext).promise.then(() => page.getTextContent()).then(textContent => {
            pdfjsLib.renderTextLayer({ textContent, container: textLayerDiv, viewport, textDivs: [] });
        });
    });

    if (pageNumberIndicator) pageNumberIndicator.textContent = `${num} / ${selectedPaper.totalPages}`;
    if (btnPrevPage) btnPrevPage.disabled = (num === 1);
    if (btnNextPage) btnNextPage.disabled = (num === selectedPaper.totalPages);
}

function fetchSummaryTextContent(filename) {
    if (summaryPlaceholderElement) summaryPlaceholderElement.style.display = "none";
    if (summaryDisplayPre) { summaryDisplayPre.style.display = "block"; summaryDisplayPre.textContent = "요약 로딩 중..."; }
    const txtUrl = `${BASE_URL}resources/assets/papers/${filename}.txt`;
    fetch(txtUrl).then(res => {
        if (!res.ok) throw new Error(res.status); return res.text(); 
    }).then(data => { 
        if (summaryDisplayPre) summaryDisplayPre.textContent = data; 
    }).catch(err => { 
        if (summaryDisplayPre) summaryDisplayPre.textContent = `⚠️ 요약본을 찾을 수 없습니다.\n경로: ${txtUrl}`; 
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

function closeAllMobilePanels() { sidebarEl.classList.remove('open'); summaryEl.classList.remove('open'); mobileBackdrop.classList.remove('active'); }

buildPapersDatabase();