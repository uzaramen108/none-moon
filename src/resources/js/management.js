const currentUser = localStorage.getItem('currentUser');
if (!currentUser) window.location.href = '../login/index.html';
console.log(`현재 사용자: ${currentUser}`);

const BACKEND_URL =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? 'http://localhost:7860/'
    : 'https://uzaramen108-paper-backend.hf.space/';

let papersList = [];
let papersMeta = {};
let userPrefs = { sort: 'desc', favorites: [], hidden: [], customTitles: {} };

const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');

// 💡 핵심 해결책: HTML이 다 불러와진 다음 실행되도록 묶음
document.addEventListener('DOMContentLoaded', () => {
  const userDisplay = document.getElementById('user-display');
  if (userDisplay) {
    userDisplay.textContent = currentUser;
  }
  loadManagementData(); // 여기서 데이터 로딩 시작!
});

async function loadManagementData() {
  const storedPrefs = localStorage.getItem(`prefs_${currentUser}`);
  if (storedPrefs) userPrefs = JSON.parse(storedPrefs);

  // 안전한 초기화
  if (!userPrefs.favorites) userPrefs.favorites = [];
  if (!userPrefs.hidden) userPrefs.hidden = [];
  if (!userPrefs.customTitles) userPrefs.customTitles = {};

  sortSelect.value = userPrefs.sort || 'desc';

  try {
    const [metaRes, listRes] = await Promise.all([
      fetch(`${BACKEND_URL}api/papers_meta`),
      fetch(`${BACKEND_URL}api/papers`),
    ]);

    // 💡 방어 코드 1: 데이터가 null이나 이상한 값으로 올 때를 대비해 기본값 할당
    if (metaRes.ok) {
        const metaData = await metaRes.json();
        papersMeta = metaData || {}; 
    }
    if (listRes.ok) {
        const listData = await listRes.json();
        papersList = listData || [];
    }

    renderList();
  } catch (err) {
    // 💡 핵심: 진짜 에러(err)가 무엇인지 콘솔에 같이 찍어보도록 수정!
    console.error('🚨 [디버깅] 논문 목록 로드 실패 원인:', err);
    
    // 유저 화면에도 에러가 났음을 표시
    const container = document.getElementById('management-list');
    if (container) {
        container.innerHTML = `<p style="text-align:center; color:#ef4444; margin-top:20px;">서버와 통신할 수 없습니다. (Hugging Face 서버가 켜지는 중일 수 있습니다. 잠시 후 새로고침 해주세요.)</p>`;
    }
  }
}

function renderList() {
  const container = document.getElementById('management-list');
  if (!container) return; // 컨테이너가 없으면 중단
  
  container.innerHTML = '';
  const query = searchInput.value.toLowerCase();

  // 💡 방어 코드 2: 혹시라도 배열이나 객체가 깨졌을 경우 강제 초기화
  if (!Array.isArray(papersList)) papersList = [];
  if (!papersMeta) papersMeta = {};

  let paperArray = papersList.map((filename, index) => {
    // 여기서 papersMeta가 null이면 에러가 났을 수 있음 (위에서 방어 완료)
    const meta = papersMeta[filename] || {
      id: index + 1,
      uploader: '초기 업로드',
      date: '-',
    };
    const customTitle = userPrefs.customTitles[filename] || filename;
    return { filename, customTitle, ...meta };
  });

  if (query) {
    paperArray = paperArray.filter(
      (p) =>
        p.filename.toLowerCase().includes(query) ||
        p.customTitle.toLowerCase().includes(query) ||
        p.uploader.toLowerCase().includes(query)
    );
  }

  paperArray.sort((a, b) => {
    if (userPrefs.sort === 'asc') return a.id - b.id;
    if (userPrefs.sort === 'name') return a.customTitle.localeCompare(b.customTitle);
    return b.id - a.id;
  });

  if (paperArray.length === 0) {
    container.innerHTML =
      "<p style='text-align:center; color:#888; margin-top:20px;'>조건에 맞는 논문이 없습니다.</p>";
    return;
  }
  
  paperArray.forEach((p) => {
    const row = document.createElement('div');
    row.className = 'paper-row';

    const isFav = userPrefs.favorites.includes(p.filename);
    const isHidden = userPrefs.hidden.includes(p.filename);
    const isMine = p.uploader === currentUser;
    const hasCustomTitle = !!userPrefs.customTitles[p.filename];

    const favIcon = isFav ? '⭐' : '☆';
    const hideIcon = isHidden ? '🙈' : '👁️';
    const opacity = isHidden ? '0.4' : '1';

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

window.enableTitleEdit = function (filename) {
  const spanEl = document.getElementById(`title-span-${filename}`);
  if (!spanEl) return;

  const currentTitle = userPrefs.customTitles[filename] || filename;

  spanEl.outerHTML = `<input type="text" id="title-input-${filename}" class="title-edit-input" value="${currentTitle}" 
        onblur="saveTitle('${filename}')" 
        onkeydown="if(event.key === 'Enter') this.blur();" 
    />`;

  const inputEl = document.getElementById(`title-input-${filename}`);
  inputEl.focus();
  inputEl.selectionStart = inputEl.selectionEnd = inputEl.value.length;
};

window.saveTitle = function (filename) {
  const inputEl = document.getElementById(`title-input-${filename}`);
  if (!inputEl) return;

  const newTitle = inputEl.value.trim();

  if (newTitle && newTitle !== filename) {
    userPrefs.customTitles[filename] = newTitle;
  } else {
    delete userPrefs.customTitles[filename];
  }

  localStorage.setItem(`prefs_${currentUser}`, JSON.stringify(userPrefs));
  renderList();
};

window.resetTitle = function (filename) {
  delete userPrefs.customTitles[filename];
  localStorage.setItem(`prefs_${currentUser}`, JSON.stringify(userPrefs));
  renderList();
};

window.togglePref = function (type, filename) {
  const idx = userPrefs[type].indexOf(filename);
  if (idx > -1) userPrefs[type].splice(idx, 1);
  else userPrefs[type].push(filename);
  localStorage.setItem(`prefs_${currentUser}`, JSON.stringify(userPrefs));
  renderList();
};

window.deletePaper = async function (filename) {
  if (!confirm(`정말 '${filename}' 논문을 삭제하시겠습니까? (복구 불가)`)) return;
  try {
    const res = await fetch(`${BACKEND_URL}api/paper/${filename}?requester=${currentUser}`, { method: 'DELETE' });
    if (res.ok) {
      delete papersMeta[filename];
      papersList = papersList.filter((p) => p !== filename);
      renderList();
    } else {
      alert('삭제 실패: 권한이 없습니다.');
    }
  } catch (err) {
    alert('서버 오류');
  }
};

searchInput.addEventListener('input', renderList);
sortSelect.addEventListener('change', (e) => {
  userPrefs.sort = e.target.value;
  localStorage.setItem(`prefs_${currentUser}`, JSON.stringify(userPrefs));
  renderList();
});