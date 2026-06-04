const currentUser = localStorage.getItem("currentUser");
if (!currentUser) window.location.href = "../login/index.html";

const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:7860/' 
    : 'https://uzaramen108-paper-backend.hf.space/';

document.getElementById("user-display").textContent = currentUser;

let papersList = []; 
let papersMeta = {}; 
// 💡 커스텀 제목을 저장할 customTitles 객체 추가
let userPrefs = { sort: "desc", favorites: [], hidden: [], customTitles: {} };

const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");

async function loadManagementData() {
    const storedPrefs = localStorage.getItem(`prefs_${currentUser}`);
    if (storedPrefs) userPrefs = JSON.parse(storedPrefs);
    
    // 안전한 초기화
    if (!userPrefs.favorites) userPrefs.favorites = [];
    if (!userPrefs.hidden) userPrefs.hidden = [];
    if (!userPrefs.customTitles) userPrefs.customTitles = {}; // 신규 속성 방어 코드
    
    sortSelect.value = userPrefs.sort || "desc";

    try {
        const [metaRes, listRes] = await Promise.all([
            fetch(`${BACKEND_URL}api/papers_meta`),
            fetch(`${BACKEND_URL}api/papers`)
        ]);
        
        if (metaRes.ok) papersMeta = await metaRes.json();
        if (listRes.ok) papersList = await listRes.json();
        
        renderList();
    } catch (err) { console.error("논문 목록을 불러오지 못했습니다."); }
}

function renderList() {
    const container = document.getElementById("management-list");
    container.innerHTML = "";
    const query = searchInput.value.toLowerCase();

    let paperArray = papersList.map((filename, index) => {
        const meta = papersMeta[filename] || { id: index + 1, uploader: "초기 업로드", date: "-" };
        // 💡 저장된 커스텀 제목이 있으면 가져옴
        const customTitle = userPrefs.customTitles[filename] || filename;
        return { filename, customTitle, ...meta };
    });

    if (query) {
        paperArray = paperArray.filter(p => 
            p.filename.toLowerCase().includes(query) || 
            p.customTitle.toLowerCase().includes(query) ||
            p.uploader.toLowerCase().includes(query)
        );
    }

    paperArray.sort((a, b) => {
        if (userPrefs.sort === "asc") return a.id - b.id;
        if (userPrefs.sort === "name") return a.customTitle.localeCompare(b.customTitle);
        return b.id - a.id; 
    });

    if (paperArray.length === 0) {
        container.innerHTML = "<p style='text-align:center; color:#888; margin-top:20px;'>조건에 맞는 논문이 없습니다.</p>";
        return;
    }

    paperArray.forEach(p => {
        const row = document.createElement("div");
        row.className = "paper-row";
        
        const isFav = userPrefs.favorites.includes(p.filename);
        const isHidden = userPrefs.hidden.includes(p.filename);
        const isMine = p.uploader === currentUser;
        const hasCustomTitle = !!userPrefs.customTitles[p.filename]; // 커스텀 제목 여부

        const favIcon = isFav ? "⭐" : "☆";
        const hideIcon = isHidden ? "🙈" : "👁️";
        const opacity = isHidden ? "0.4" : "1";

        row.innerHTML = `
            <div style="opacity: ${opacity}; transition: opacity 0.3s; flex: 1; overflow: hidden; margin-right: 15px;">
                <div class="title-container">
                    <span style="color: #64748b; font-weight: bold;">[No.${p.id}]</span> 
                    <span class="title-text" id="title-span-${p.filename}" onclick="enableTitleEdit('${p.filename}')" title="클릭하여 제목 수정">${p.customTitle}</span>
                    ${hasCustomTitle ? `<button class="btn-reset" onclick="resetTitle('${p.filename}')">🔄 초기화</button>` : ''}
                </div>
                <div style="font-size: 0.85em; color: #666; margin-top: 4px; margin-left: 2px;">
                    투고자: ${p.uploader} | ${p.date} 
                    ${hasCustomTitle ? `<br><span style="color: #94a3b8;">원본명: ${p.filename}</span>` : ''}
                </div>
            </div>
            <div class="controls" style="flex-shrink: 0;">
                <button class="icon-btn" onclick="togglePref('favorites', '${p.filename}')" title="즐겨찾기 토글">${favIcon}</button>
                <button class="icon-btn" onclick="togglePref('hidden', '${p.filename}')" title="숨기기 토글">${hideIcon}</button>
                ${isMine ? `<button class="btn-delete" onclick="deletePaper('${p.filename}')" title="삭제">🗑️ 삭제</button>` : ''}
            </div>
        `;
        container.appendChild(row);
    });
}

// 💡 [제목 수정 기능 1] 텍스트를 인풋 박스로 변경
window.enableTitleEdit = function(filename) {
    const spanEl = document.getElementById(`title-span-${filename}`);
    if (!spanEl) return;
    
    const currentTitle = userPrefs.customTitles[filename] || filename;
    
    // onblur(포커스 잃음) 또는 Enter 키 누를 시 저장 함수 호출
    spanEl.outerHTML = `<input type="text" id="title-input-${filename}" class="title-edit-input" value="${currentTitle}" 
        onblur="saveTitle('${filename}')" 
        onkeydown="if(event.key === 'Enter') this.blur();" 
    />`;
    
    const inputEl = document.getElementById(`title-input-${filename}`);
    inputEl.focus();
    inputEl.selectionStart = inputEl.selectionEnd = inputEl.value.length; // 커서를 맨 끝으로
};

// 💡 [제목 수정 기능 2] 인풋 박스 값을 저장하고 다시 렌더링
window.saveTitle = function(filename) {
    const inputEl = document.getElementById(`title-input-${filename}`);
    if (!inputEl) return;
    
    const newTitle = inputEl.value.trim();
    
    // 공백이 아니면서 원본 이름과 다를 때만 저장
    if (newTitle && newTitle !== filename) {
        userPrefs.customTitles[filename] = newTitle;
    } else {
        delete userPrefs.customTitles[filename]; // 빈칸이거나 원본과 같으면 초기화
    }
    
    localStorage.setItem(`prefs_${currentUser}`, JSON.stringify(userPrefs));
    renderList();
};

// 💡 [제목 수정 기능 3] 초기화 버튼 클릭 시 원본으로 복구
window.resetTitle = function(filename) {
    delete userPrefs.customTitles[filename];
    localStorage.setItem(`prefs_${currentUser}`, JSON.stringify(userPrefs));
    renderList();
};

window.togglePref = function(type, filename) {
    const idx = userPrefs[type].indexOf(filename);
    if (idx > -1) userPrefs[type].splice(idx, 1);
    else userPrefs[type].push(filename);
    localStorage.setItem(`prefs_${currentUser}`, JSON.stringify(userPrefs));
    renderList(); 
};

window.deletePaper = async function(filename) {
    if (!confirm(`정말 '${filename}' 논문을 삭제하시겠습니까? (복구 불가)`)) return;
    try {
        const res = await fetch(`${BACKEND_URL}api/paper/${filename}?requester=${currentUser}`, { method: "DELETE" });
        if (res.ok) {
            delete papersMeta[filename];
            papersList = papersList.filter(p => p !== filename);
            renderList();
        } else { alert("삭제 실패: 권한이 없습니다."); }
    } catch (err) { alert("서버 오류"); }
};

searchInput.addEventListener("input", renderList);
sortSelect.addEventListener("change", (e) => {
    userPrefs.sort = e.target.value;
    localStorage.setItem(`prefs_${currentUser}`, JSON.stringify(userPrefs));
    renderList();
});

loadManagementData();