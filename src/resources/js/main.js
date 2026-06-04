// ==========================================
// 💡 [1] 인증 가드: 로그인 안 했으면 바로 쫓아냄
// ==========================================
const currentUser = localStorage.getItem("currentUser");

if (!currentUser) {
    alert("로그인이 필요한 서비스입니다.");
    window.location.href = "login/index.html"; 
}
// ==========================================

import '../style.css'; 
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let papersDatabase = [];
let selectedPaper = null;
let currentPdfDocument = null; 
let currentPageNumber = 1;
let currentSummaries = [];
let currentSumIndex = 0;

// 줌 및 드래그 상태 관리
let currentZoom = 1.0; 
let zoomTimeout = null;
let isDragging = false;
let dragStartX, dragStartY, scrollLeftStart, scrollTopStart;
let isEditingMode = false;

// 💡 [중요] 배포 후 이곳에 본인의 Hugging Face Space URL을 넣으세요.
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:7860/' 
    : 'https://uzaramen108-paper-backend.hf.space/';

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

// 요약본 수정 관련 DOM 변경
const summaryWrapper = document.getElementById("summary-wrapper");
const summaryEditArea = document.getElementById("summary-edit-area");
const summaryPlaceholderElement = document.getElementById("summary-placeholder");
const btnEditSummary = document.getElementById("btn-edit-summary");
const pdfUploadInput = document.getElementById("pdf-upload-input");
const viewportContainer = document.getElementById("viewport-container");
const pdfPaddingWrapper = document.getElementById("pdf-padding-wrapper");
const btnToggleSidebar = document.getElementById("btn-toggle-sidebar");
const summaryMeta = document.getElementById("summary-meta");
const summaryAuthor = document.getElementById("summary-author");
const summaryDate = document.getElementById("summary-date");
const summaryControls = document.getElementById("summary-controls");
const btnVoteHelp = document.getElementById("btn-vote-help");
const btnVoteRevise = document.getElementById("btn-vote-revise");
const btnSumPrev = document.getElementById("btn-sum-prev");
const btnSumNext = document.getElementById("btn-sum-next");
const sumNavIndicator = document.getElementById("summary-nav-indicator");
const btnManagement = document.getElementById("btn-management");

// 초기 로드 시 실행 (유저 정보 표시 및 초기화)
document.addEventListener("DOMContentLoaded", () => {
    const userDisplay = document.getElementById("current-user-display");
    if (userDisplay) {
        userDisplay.textContent = `👤 ${currentUser}님`;
    }

    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            if (confirm("정말 로그아웃 하시겠습니까?")) {
                localStorage.removeItem("currentUser");
                window.location.href = "login/index.html";
            }
        });
    }

    initializeDashboard();
});

async function buildPapersDatabase() {
    paperListContainer.innerHTML = "";
    try {
        const storedPrefs = localStorage.getItem(`prefs_${currentUser}`);
        const userPrefs = storedPrefs ? JSON.parse(storedPrefs) : { sort: "desc", favorites: [], hidden: [], customTitles: {} };
        if (!userPrefs.hidden) userPrefs.hidden = [];
        if (!userPrefs.favorites) userPrefs.favorites = [];
        if (!userPrefs.customTitles) userPrefs.customTitles = {}; // 💡 속성 보장

        const [metaRes, listRes] = await Promise.all([
            fetch(`${BACKEND_URL}api/papers_meta`),
            fetch(`${BACKEND_URL}api/papers`)
        ]);

        const papersMeta = metaRes.ok ? await metaRes.json() : {};
        if (!listRes.ok) throw new Error(listRes.status);
        const fetchedFiles = await listRes.json();
        
        let paperArray = fetchedFiles
            .map((filename, index) => ({
                filename,
                id: papersMeta[filename]?.id || (index + 1), 
                isFav: userPrefs.favorites.includes(filename),
                // 💡 커스텀 제목이 있으면 그걸 쓰고, 없으면 원본 filename을 사용
                displayName: userPrefs.customTitles[filename] || filename 
            }))
            .filter(p => !userPrefs.hidden.includes(p.filename)); 

        paperArray.sort((a, b) => {
            if (a.isFav && !b.isFav) return -1;
            if (!a.isFav && b.isFav) return 1;
            
            if (userPrefs.sort === "asc") return a.id - b.id;
            if (userPrefs.sort === "name") return a.displayName.localeCompare(b.displayName); // 정렬도 커스텀 이름 기준
            return b.id - a.id; 
        });
        
        paperCountBadge.textContent = `${paperArray.length} Papers`;
        
        paperArray.forEach((paper) => {
            const itemLayout = document.createElement("li");
            itemLayout.className = "paper-item";
            itemLayout.dataset.filename = paper.filename;
            
            const favMark = paper.isFav ? "<span style='color: #f59e0b;'>⭐ </span>" : "";
            itemLayout.innerHTML = `
                <span class="paper-meta">No.${paper.id}</span>
                <span class="paper-title" title="${paper.filename}">${favMark}${paper.displayName}</span> 
            `;
            
            itemLayout.addEventListener("click", () => handlePaperSelection(paper.filename));
            paperListContainer.appendChild(itemLayout);
        });
        
        // 전역 데이터베이스 업데이트 (검색/선택 연동)
        papersDatabase = paperArray.map(p => ({ filename: p.filename, displayName: p.displayName }));
        
    } catch (error) {
        if(viewerPlaceholderElement) viewerPlaceholderElement.innerHTML = `<p style="color:#ef4444; font-weight:bold;">⚠️ 백엔드 서버 연결에 실패했습니다.</p>`;
    }
}

function initializeDashboard() {
    buildPapersDatabase();

    if (btnPrevPage) btnPrevPage.addEventListener("click", handlePreviousPageAction);
    if (btnNextPage) btnNextPage.addEventListener("click", handleNextPageAction);
    if (mobileBackdrop) mobileBackdrop.addEventListener("click", closeAllMobilePanels);
    
    // 💡 논문 투고 (uploader 추가 완료)
    if (pdfUploadInput) {
        pdfUploadInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append("file", file);
            formData.append("uploader", currentUser); // ⭐️ 백엔드에서 필요한 투고자 정보

            alert("🚀 논문 업로드를 시작합니다. 잠시만 기다려주세요...");
            try {
                const res = await fetch(`${BACKEND_URL}api/upload`, { method: "POST", body: formData });
                if (res.ok) {
                    alert("✅ 논문 투고 완료! 목록을 새로고침합니다.");
                    buildPapersDatabase();
                } else {
                    throw new Error();
                }
            } catch (err) {
                alert("❌ 업로드 실패. 파일 이름에 특수문자가 없는지 확인해 주세요.");
            }
        });
    }

    // 💡 요약본 저장 (중복 제거 및 최신 로직)
    if (btnEditSummary) {
        btnEditSummary.addEventListener("click", async () => {
            if (!selectedPaper) return;
            
            if (!isEditingMode) {
                isEditingMode = true;
                btnEditSummary.textContent = "저장";
                summaryEl.classList.add("editing");
                summaryEditArea.readOnly = false;
                
                if (!currentSummaries.find(s => s.author === currentUser) && currentSummaries.length > 0 && currentSummaries[currentSumIndex].author !== currentUser) {
                    summaryEditArea.value = "";
                    summaryEditArea.placeholder = "새로운 요약본을 작성해주세요. (최대 4개 제한)";
                }
                summaryEditArea.focus();
            } else {
                btnEditSummary.textContent = "저장 중...";
                try {
                    const res = await fetch(`${BACKEND_URL}api/summary/save`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                            filename: selectedPaper.filename, 
                            author: currentUser,
                            text: summaryEditArea.value 
                        })
                    });
                    if (res.ok) {
                        alert("✅ 요약본이 안전하게 저장되었습니다.");
                    } else {
                        throw new Error("저장 실패");
                    }
                } catch (err) { alert("❌ 요약본 저장 실패"); }
                
                isEditingMode = false;
                summaryEl.classList.remove("editing");
                summaryEditArea.readOnly = true;
                fetchSummaryTextContent(selectedPaper.filename); 
            }
        });
    }

    // 설정(관리) 페이지 이동
    if (btnManagement) {
        btnManagement.addEventListener("click", () => {
            window.location.href = "management/index.html";
        });
    }

    // 사이드바 토글
    btnToggleSidebar.addEventListener("click", () => {
        if (window.innerWidth > 768) {
            sidebarEl.style.display = sidebarEl.style.display === "none" ? "block" : "none";
            if (currentPdfDocument) setTimeout(() => renderPage(currentPageNumber), 300); 
        } else {
            sidebarEl.classList.add("open");
            mobileBackdrop.classList.add("active");
        }
    });

    // 휠 및 드래그 동작
    if (viewportContainer) {
        viewportContainer.addEventListener("wheel", (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault(); 
                currentZoom += e.deltaY < 0 ? 0.2 : -0.2;
                currentZoom = Math.max(1.0, Math.min(currentZoom, 3.0));
                viewportContainer.style.cursor = currentZoom > 1.0 ? 'grab' : 'default';
                clearTimeout(zoomTimeout);
                zoomTimeout = setTimeout(() => { if (currentPdfDocument) renderPage(currentPageNumber); }, 100);
            }
        }, { passive: false });

        viewportContainer.addEventListener('mousedown', (e) => {
            if (e.target.closest('.textLayer')) { isDragging = false; return; }
            if (currentZoom <= 1.0) return; 
            isDragging = true;
            viewportContainer.style.userSelect = 'none';
            if (textLayerDiv) textLayerDiv.style.pointerEvents = 'none';
            viewportContainer.style.cursor = 'grabbing';
            dragStartX = e.pageX - viewportContainer.offsetLeft;
            dragStartY = e.pageY - viewportContainer.offsetTop;
            scrollLeftStart = viewportContainer.scrollLeft;
            scrollTopStart = viewportContainer.scrollTop;
        });

        const endDrag = () => {
            if (isDragging) {
                isDragging = false;
                viewportContainer.style.cursor = currentZoom > 1.0 ? 'grab' : 'default';
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

    // 좌우 넘기기 버튼
    if(btnSumPrev) btnSumPrev.addEventListener("click", () => {
        if(currentSumIndex > 0) { currentSumIndex--; renderSummaryView(); }
    });
    if(btnSumNext) btnSumNext.addEventListener("click", () => {
        if(currentSumIndex < currentSummaries.length - 1) { currentSumIndex++; renderSummaryView(); }
    });

    // 피드백 투표하기
    const handleVote = async (voteType) => {
        const targetAuthor = currentSummaries[currentSumIndex].author;
        if (targetAuthor === currentUser) return alert("자신의 요약본에는 투표할 수 없습니다.");
        
        try {
            await fetch(`${BACKEND_URL}api/summary/vote`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename: selectedPaper.filename, target_author: targetAuthor, voter: currentUser, vote_type: voteType })
            });
            fetchSummaryTextContent(selectedPaper.filename); // 투표 후 데이터 새로고침
        } catch (err) { alert("투표 처리 중 오류가 발생했습니다."); }
    };
    if(btnVoteHelp) btnVoteHelp.addEventListener("click", () => handleVote("helpful"));
    if(btnVoteRevise) btnVoteRevise.addEventListener("click", () => handleVote("needs_revision"));
}

function handlePaperSelection(filename) {
    selectedPaper = papersDatabase.find(p => p.filename === filename);
    currentPageNumber = 1;
    currentPdfDocument = null;
    currentZoom = 1.0; 
    isEditingMode = false;
    if(btnEditSummary) btnEditSummary.textContent = "편집";
    if(summaryEl) summaryEl.classList.remove("editing");
    if(summaryEditArea) summaryEditArea.readOnly = true;
    if(viewportContainer) viewportContainer.style.cursor = 'default';

    document.querySelectorAll(".paper-item").forEach(item => item.dataset.filename === filename ? item.classList.add("active") : item.classList.remove("active"));
    if (viewerTitleDisplay) viewerTitleDisplay.textContent = selectedPaper.displayName;
    
    const pdfUrl = `${BACKEND_URL}api/pdf/${selectedPaper.filename}`;
    
    if (summaryEl) summaryEl.style.display = "flex"; 
    if (pdfDownloadLink) { pdfDownloadLink.style.display = "inline-flex"; pdfDownloadLink.href = pdfUrl; }
    if (viewerControlsPanel) viewerControlsPanel.style.display = "flex";
    if (btnEditSummary) btnEditSummary.style.display = "block";

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
        const targetWidth = viewportContainer.clientWidth - 40;
        const targetHeight = viewportContainer.clientHeight - 120;
        
        const scaleWidth = targetWidth / unscaledViewport.width;
        const scaleHeight = targetHeight / unscaledViewport.height;
        const baseScale = Math.min(scaleWidth, scaleHeight);

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

// 💡 새로운 요약본 데이터 로드 & 정렬 (JSON)
async function fetchSummaryTextContent(filename) {
    if (summaryPlaceholderElement) summaryPlaceholderElement.style.display = "none";
    if (summaryWrapper) summaryWrapper.style.display = "flex";
    
    try {
        const res = await fetch(`${BACKEND_URL}api/summary/${filename}`);
        if (!res.ok) throw new Error();
        
        let data = await res.json();
        
        // 정렬: 도움돼요 많은 순 -> 작성일 빠른 순
        currentSummaries = data.sort((a, b) => {
            const helpDiff = (b.helpful || []).length - (a.helpful || []).length;
            if (helpDiff !== 0) return helpDiff;
            return new Date(a.date) - new Date(b.date);
        });

        currentSumIndex = 0;
        renderSummaryView();
    } catch (err) {
        if(summaryEditArea) summaryEditArea.value = `⚠️ 요약본 데이터를 불러오지 못했습니다.`;
    }
}

// 💡 요약본 화면 렌더링
function renderSummaryView() {
    if (currentSummaries.length === 0) {
        if(summaryEditArea) {
            summaryEditArea.value = "";
            summaryEditArea.placeholder = "아직 작성된 요약본이 없습니다. 첫 번째 요약본을 작성해보세요!";
        }
        if(summaryMeta) summaryMeta.style.display = "none";
        if(summaryControls) summaryControls.style.display = "none";
        if(btnEditSummary) {
            btnEditSummary.textContent = "새로 작성";
            btnEditSummary.style.display = "block";
        }
        return;
    }

    const currentSum = currentSummaries[currentSumIndex];
    if(summaryMeta) summaryMeta.style.display = "flex";
    if(summaryControls) summaryControls.style.display = "flex";
    
    if(summaryAuthor) summaryAuthor.textContent = `작성자: ${currentSum.author}`;
    if(summaryDate) summaryDate.textContent = `작성일: ${currentSum.date}`;
    if(summaryEditArea) summaryEditArea.value = currentSum.text;

    const helpCount = (currentSum.helpful || []).length;
    const reviseCount = (currentSum.needs_revision || []).length;
    if(btnVoteHelp) {
        btnVoteHelp.textContent = `👍 도움이 되어요 (${helpCount})`;
        btnVoteHelp.style.opacity = (currentSum.helpful || []).includes(currentUser) ? "1" : "0.5";
    }
    if(btnVoteRevise) {
        btnVoteRevise.textContent = `⚠️ 수정이 필요해요 (${reviseCount})`;
        btnVoteRevise.style.opacity = (currentSum.needs_revision || []).includes(currentUser) ? "1" : "0.5";
    }

    if(sumNavIndicator) sumNavIndicator.textContent = `${currentSumIndex + 1} / ${currentSummaries.length}`;
    if(btnSumPrev) btnSumPrev.disabled = currentSumIndex === 0;
    if(btnSumNext) btnSumNext.disabled = currentSumIndex === currentSummaries.length - 1;

    const mySummary = currentSummaries.find(s => s.author === currentUser);
    if(btnEditSummary) {
        if (currentSum.author === currentUser) {
            btnEditSummary.textContent = "편집";
            btnEditSummary.style.display = "block";
        } else if (!mySummary) {
            btnEditSummary.textContent = "새로 작성";
            btnEditSummary.style.display = "block";
        } else {
            btnEditSummary.style.display = "none"; 
        }
    }
}

function handlePreviousPageAction() { if (currentPageNumber > 1) { currentPageNumber--; renderPage(currentPageNumber); } }
function handleNextPageAction() { if (currentPageNumber < selectedPaper.totalPages) { currentPageNumber++; renderPage(currentPageNumber); } }
function closeAllMobilePanels() { sidebarEl.classList.remove('open'); summaryEl.classList.remove('open'); mobileBackdrop.classList.remove('active'); }