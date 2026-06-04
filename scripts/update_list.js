const fs = require('fs');
const path = require('path');

// public 폴더 없이 최상위 폴더 기준 경로 설정
const resourcesDir = path.join(__dirname, '..', 'src', 'resources');
const jsonFilepath = path.join(__dirname, '..', 'papers.json');

// resources 폴더가 없으면 생성
if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
}

const pdfList = [];
let newTxtCount = 0;

// 폴더 안의 파일들 스캔
const files = fs.readdirSync(resourcesDir);

files.forEach(file => {
    if (path.extname(file).toLowerCase() === '.pdf') {
        const baseName = path.basename(file, '.pdf');
        pdfList.push(baseName);

        const txtFilename = `${baseName}.txt`;
        const txtFilepath = path.join(resourcesDir, txtFilename);

        // 요약본 TXT가 없으면 자동 생성
        if (!fs.existsSync(txtFilepath)) {
            const defaultText = `[요약본 대기 중]\n\n논문 제목: ${baseName}\n\n아직 요약본이 작성되지 않았습니다. 팀원들과 리뷰 후 이 파일(.txt)을 열어 내용을 채워주세요.`;
            fs.writeFileSync(txtFilepath, defaultText, 'utf8');
            console.log(`📄 빈 요약 파일 자동 생성됨: ${txtFilename}`);
            newTxtCount++;
        }
    }
});

// papers.json 생성 (루트 경로에 덮어쓰기)
fs.writeFileSync(jsonFilepath, JSON.stringify(pdfList, null, 4), 'utf8');

console.log("\n==========================================");
console.log(`✅ 파일 리스트 업데이트 완료!`);
console.log(` - 스캔된 논문 (PDF) : ${pdfList.length}편`);
console.log(` - 새로 만든 요약본(TXT) : ${newTxtCount}개`);
console.log("==========================================");