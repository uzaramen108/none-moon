// 💡 본인의 Hugging Face Space URL 입력
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:7860/' 
    : 'https://uzaramen108-paper-backend.hf.space/'; 

let isLoginMode = true;

const authTitle = document.getElementById("auth-title");
const submitBtn = document.getElementById("submit-btn");
const toggleModeBtn = document.getElementById("toggle-mode-btn");
const authForm = document.getElementById("auth-form");
const nicknameInput = document.getElementById("nickname");
const passwordInput = document.getElementById("password");

// 모드 토글 (로그인 <-> 회원가입)
toggleModeBtn.addEventListener("click", () => {
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
        authTitle.textContent = "즐거운 논문생활 ^ ^...";
        submitBtn.textContent = "로그인";
        toggleModeBtn.textContent = "계정이 없으신가요? 회원가입하기";
    } else {
        authTitle.textContent = "웰컴 투 논문 라이프~";
        submitBtn.textContent = "회원가입";
        toggleModeBtn.textContent = "이미 계정이 있으신가요? 로그인하기";
    }
});

authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nickname = nicknameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!nickname || !password) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "처리 중...";

    const endpoint = isLoginMode ? "api/login" : "api/signup";

    try {
        const response = await fetch(`${BACKEND_URL}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nickname, password })
        });

        const result = await response.json();

        if (response.ok) {
            if (isLoginMode) {
                // 로그인 성공 시 로컬 스토리지에 닉네임 저장
                localStorage.setItem("currentUser", result.nickname);
                alert(`${result.nickname}님, 환영합니다!`);
                // 메인 페이지로 이동 (상대 경로 주의)
                window.location.href = "../index.html"; 
            } else {
                alert("회원가입이 완료되었습니다. 로그인해주세요.");
                toggleModeBtn.click(); // 로그인 모드로 전환
            }
        } else {
            alert(`오류: ${result.detail}`);
        }
    } catch (error) {
        alert("서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = isLoginMode ? "접속하기" : "가입하기";
    }
});