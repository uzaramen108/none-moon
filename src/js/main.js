// 유저가 업로드한 10개 논문의 실제 파일명 데이터
const papersDatabase = [
    { filename: "Syngas production through CO2-mediated pyrolysis of polyoxymethylene", displayName: "CO2 매개 POM 열분해를 통한 합성가스 생산 (2024)" },
    { filename: "Pyrolysis mechanism of engineering plastic waste under carbon dioxide", displayName: "이산화탄소 분위기 고성능 플라스틱 열분해 메커니즘 (2026)" },
    { filename: "Sustainable-microwave-driven-CO2-gasification-of-_2024_Applied-Catalysis-B--", displayName: "마이크로웨이브 구동 폐플라스틱 CO2 가스화 공정 (2024)" },
    { filename: "Enhancement-of-syngas-through-integrating-carbon-dioxi_2024_Energy-Conversio", displayName: "열화학적 가스화 공정 내 이산화탄소 대량 통합 효과 (2024)" },
    { filename: "Evaluating-sustainability-of-CO2-mediated-pyrolysis-of_2025_Bioresource-Tech", displayName: "CO2 매개 열분해 기술 전과정 평가 (LCA 지속가능성, 2025)" },
    { filename: "Assessing changes to nutrient density and availability following separation", displayName: "고액 분리 공정에 따른 가축 분뇨 슬러리 영양소 밀도 변화" },
    { filename: "Compositional modification of products from Co-Pyrolysis of chicken", displayName: "도계 부산물 바이오매스 CO2 매개 공-열분해 유분 개질" },
    { filename: "Thermo-chemical-disposal-of-plastic-waste-from-end-of-life-vehicle_2024_Ener", displayName: "폐자동차(ELV) 유래 혼합 플라스틱 폐기물 열화학적 처리 (2024)" },
    { filename: "Thermochemical-processing-for-the-sustainable-disposal-of-spen_2024_Chemosph", displayName: "유해 오염물 흡착 폐기질의 지속 가능한 고온 개질 정제 (2024)" },
    { filename: "Valorizing-spent-mushroom-substrate-into-syngas-by-the-_2024_Bioresource-Tec", displayName: "폐버섯배지(SMS) 바이오매스의 CO2 매개 합성가스 자원화 (2024)" }
];

let selectedPaper = null;
let currentPageNumber = 1;

// DOM 캐싱
const sidebarEl = document.getElementById("sidebar");
const summaryEl = document.getElementById("summary-container");
const mobileBackdrop = document.getElementById("mobile-backdrop");
const paperListContainer = document.getElementById("paper-list");
const paperCountBadge = document.getElementById("paper-count");
const viewerTitleDisplay = document.getElementById("viewer-title");
const pdfDownloadLink = document.getElementById("pdf-download-link");
const documentImageElement = document.getElementById("document-image");
const viewerPlaceholderElement = document.getElementById("viewer-placeholder");
const viewerControlsPanel = document.getElementById("viewer-controls");
const pageNumberIndicator = document.getElementById("page-number-indicator");
const btnPrevPage = document.getElementById("btn-prev");
const btnNextPage = document.getElementById("btn-next");
const summaryDisplayPre = document.getElementById("summary-display");
const summaryPlaceholderElement = document.getElementById("summary-placeholder");
const btnCopySummary = document.getElementById("btn-copy");
const btnToggleSidebar = document.getElementById("btn-toggle-sidebar");

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
        } else {
            sidebarEl.classList.add("open");
            mobileBackdrop.classList.add("active");
        }
    });
}

function handlePaperSelection(filename) {
    selectedPaper = papersDatabase.find(p => p.filename === filename);
    currentPageNumber = 1;

    document.querySelectorAll(".paper-item").forEach(item => {
        if (item.dataset.filename === filename) item.classList.add("active");
        else item.classList.remove("active");
    });

    viewerTitleDisplay.textContent = selectedPaper.displayName;
    pdfDownloadLink.style.display = "inline-flex";
    pdfDownloadLink.href = `./src/resources/${selectedPaper.filename}.pdf`;
    
    viewerControlsPanel.style.display = "flex";
    btnCopySummary.style.display = "block";

    fetchSummaryTextContent(selectedPaper.filename);

    viewerPlaceholderElement.style.display = "block";
    viewerPlaceholderElement.innerHTML = "<p>🔍 원문 이미지 개수 파악 중...</p>";
    documentImageElement.style.display = "none";

    probePaperImages(selectedPaper.filename, (total, isPadded) => {
        if (total === 0) {
            viewerPlaceholderElement.innerHTML = `<p>⚠️ 이미지를 찾을 수 없습니다.</p>`;
        } else {
            selectedPaper.totalPages = total;
            selectedPaper.isPadded = isPadded; 
            renderTargetImageFrame();
        }
    });

    if (window.innerWidth <= 768) {
        closeAllMobilePanels();
    }
}

function probePaperImages(filename, callback) {
    let currentMax = 0;
    let detectedPadded = false;

    function tryLoad(page, checkingPadded) {
        const img = new Image();
        let pageStr = checkingPadded ? String(page).padStart(2, '0') : String(page);
        
        img.onload = () => {
            currentMax = page;
            detectedPadded = checkingPadded;
            tryLoad(page + 1, checkingPadded);
        };

        img.onerror = () => {
            if (page === 1 && !checkingPadded) tryLoad(1, true);
            else callback(currentMax, detectedPadded);
        };

        img.src = `./src/resources/${filename}/${filename}-${pageStr}.png`;
    }
    tryLoad(1, false);
}

function renderTargetImageFrame() {
    viewerPlaceholderElement.style.display = "none";
    documentImageElement.style.display = "block";

    let pageStr = selectedPaper.isPadded ? String(currentPageNumber).padStart(2, '0') : String(currentPageNumber);
    documentImageElement.src = `./src/resources/${selectedPaper.filename}/${selectedPaper.filename}-${pageStr}.png`;

    pageNumberIndicator.textContent = `${currentPageNumber} / ${selectedPaper.totalPages}`;
    btnPrevPage.disabled = (currentPageNumber === 1);
    btnNextPage.disabled = (currentPageNumber === selectedPaper.totalPages);
}

function fetchSummaryTextContent(filename) {
    summaryPlaceholderElement.style.display = "none";
    summaryDisplayPre.style.display = "block";
    summaryDisplayPre.textContent = "요약 텍스트 로딩 중...";

    fetch(`./src/resources/${filename}.txt`)
        .then(response => {
            if (!response.ok) throw new Error("에러");
            return response.text();
        })
        .then(data => { summaryDisplayPre.textContent = data; })
        .catch(err => { summaryDisplayPre.textContent = `⚠️ 요약본 로드 실패`; });
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

function handlePreviousPageAction() {
    if (currentPageNumber > 1) { currentPageNumber--; renderTargetImageFrame(); }
}
function handleNextPageAction() {
    if (currentPageNumber < selectedPaper.totalPages) { currentPageNumber++; renderTargetImageFrame(); }
}

// ==========================================
// 📱 모바일 스와이프(Swipe) 터치 제어 로직
// ==========================================
let touchStartX = 0;
let touchEndX = 0;
const SWIPE_THRESHOLD = 60;
let isSwipeAllowed = true;

document.addEventListener('touchstart', e => {
    // 1. 두 손가락 이상 닿으면 확대/축소 동작이므로 스와이프 무시
    if (e.touches.length > 1) {
        isSwipeAllowed = false;
        return;
    }

    // 2. 화면이 조금이라도 확대된 상태(scale > 1)라면 스와이프 무시
    const currentScale = window.visualViewport ? window.visualViewport.scale : 1;
    if (currentScale > 1.05) {
        isSwipeAllowed = false;
        return;
    }

    isSwipeAllowed = true;
    touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

document.addEventListener('touchmove', e => {
    // 움직이는 도중에 두 손가락이 닿아도 스와이프 차단
    if (e.touches.length > 1) {
        isSwipeAllowed = false;
    }
}, { passive: true });

document.addEventListener('touchend', e => {
    if (!isSwipeAllowed) return; // 스와이프 조건에 부합하지 않으면 탈출

    touchEndX = e.changedTouches[0].screenX;
    handleSwipeGesture();
}, { passive: true });

function handleSwipeGesture() {
    if (window.innerWidth > 768) return;

    const swipeDistance = touchEndX - touchStartX;

    if (swipeDistance > SWIPE_THRESHOLD) {
        if (summaryEl.classList.contains('open')) {
            summaryEl.classList.remove('open');
            mobileBackdrop.classList.remove('active');
        } else {
            sidebarEl.classList.add('open');
            mobileBackdrop.classList.add('active');
        }
    }
    else if (swipeDistance < -SWIPE_THRESHOLD) {
        if (sidebarEl.classList.contains('open')) {
            sidebarEl.classList.remove('open');
            mobileBackdrop.classList.remove('active');
        } else {
            if (selectedPaper) {
                summaryEl.classList.add('open');
                mobileBackdrop.classList.add('active');
            }
        }
    }
}

function closeAllMobilePanels() {
    sidebarEl.classList.remove('open');
    summaryEl.classList.remove('open');
    mobileBackdrop.classList.remove('active');
}

initializeDashboard();