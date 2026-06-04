const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..'); // 현재 최상위 폴더
const distDir = path.join(__dirname, '..', 'dist'); // 배포용 폴더

// 기존 dist 폴더가 있다면 삭제 후 재생성 (찌꺼기 제거)
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);

// 배포에 필요한 파일 및 폴더만 명시적으로 복사
const filesToCopy = ['index.html', 'papers.json', 'src'];

function copyRecursiveSync(src, dest) {
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(childItemName => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

filesToCopy.forEach(item => {
    const sourcePath = path.join(srcDir, item);
    const destPath = path.join(distDir, item);
    if (fs.existsSync(sourcePath)) {
        copyRecursiveSync(sourcePath, destPath);
        console.log(`✅ 복사 완료: ${item}`);
    } else {
        console.warn(`⚠️ 경고: ${item} 파일을 찾을 수 없습니다.`);
    }
});

console.log('🎉 빌드 완료! (dist 폴더 생성됨)');