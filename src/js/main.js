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

// 💡 파이썬이 생성한 papers.json을 불러와서 자동으로 리스트를 구축합니다.
async function buildPapersDatabase() {
    try {
        const response = await fetch('./papers.json');
        if (!response.ok) throw new Error("papers.json 파일이 없습니다.");
        
        const fetchedFiles = await response.json();

        // 한글 이름 굳이 안 쓴다고 했으니 파일명 그대로 출력
        papersDatabase = fetchedFiles.map(filename => ({
            filename: filename,
            displayName: filename 
        }));

        initializeDashboard();

    } catch (error) {
        console.error(error);
        viewerPlaceholderElement.innerHTML = `<p>⚠️ 논문 목록(papers.json)을 불러오지 못했습니다.<br>먼저 <b>update_list.py</b>를 실행해서 목록을 업데이트 해주세요.</p>`;
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
}

function handlePaperSelection(filename) {
    selectedPaper = papersDatabase.find(p => p.filename === filename);
    currentPageNumber = 1;
    currentPdfDocument = null;

    document.querySelectorAll(".paper-item").forEach(item => item.dataset.filename === filename ? item.classList.add("active") : item.classList.remove("active"));

    viewerTitleDisplay.textContent = selectedPaper.displayName;
    
    const pdfUrl = `./src/resources/${selectedPaper.filename}.pdf`;
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
}

function loadPDFDocument(url) {
    pdfjsLib.getDocument(url).promise.then(pdfDoc => {
        currentPdfDocument = pdfDoc;
        selectedPaper.totalPages = pdfDoc.numPages; 
        renderPage(currentPageNumber);
    }).catch(err => {
        viewerPlaceholderElement.innerHTML = `<p>⚠️ 로드 실패: resources 폴더에 PDF가 있는지 확인해주세요.</p>`;
    });
}

function renderPage(num) {
    viewerPlaceholderElement.style.display = "none";
    pdfCanvas.style.display = "block";
    textLayerDiv.style.display = "block";

    currentPdfDocument.getPage(num).then(page => {
        const viewportContainer = document.querySelector('.image-viewport');
        const containerWidth = viewportContainer.clientWidth - 48; 
        
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        let scale = containerWidth / unscaledViewport.width;
        if (scale < 1.0) scale = 1.2; 

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
    summaryPlaceholderElement.style.display = "none";
    summaryDisplayPre.style.display = "block";
    summaryDisplayPre.textContent = "요약 로딩 중...";
    fetch(`./src/resources/${filename}.txt`)
        .then(res => { if (!res.ok) throw new Error(); return res.text(); })
        .then(data => { summaryDisplayPre.textContent = data; })
        .catch(err => { summaryDisplayPre.textContent = `⚠️ 요약본이 없습니다.`; });
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

// 💡 대시보드 구동 시작점
buildPapersDatabase();