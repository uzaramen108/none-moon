import os

# 스크립트가 실행되는 현재 폴더 지정
target_dir = os.path.dirname(os.path.abspath(__file__))

# TXT 파일 목록 가져오기
txt_files = [f for f in os.listdir(target_dir) if f.endswith('.txt')]
print(f"🔍 총 {len(txt_files)}개의 TXT 파일을 검사하여 복구를 시도합니다...\n")

for txt_filename in txt_files:
    txt_path = os.path.join(target_dir, txt_filename)
    
    with open(txt_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    original_name = None
    new_lines = []
    
    # 한 줄씩 읽으면서 '원제:' 찾기
    for line in lines:
        if line.startswith("원제:"):
            original_name = line.replace("원제:", "").strip()
        else:
            new_lines.append(line)
    
    if original_name:
        # 원제 정보를 찾았을 때
        base_current_name = txt_filename[:-4] # 현재 파일의 기본 이름 (확장자 제외)
        current_pdf_path = os.path.join(target_dir, f"{base_current_name}.pdf")
        
        new_txt_path = os.path.join(target_dir, f"{original_name}.txt")
        new_pdf_path = os.path.join(target_dir, f"{original_name}.pdf")
        
        # 1. 텍스트 파일에서 '원제:' 라인 지우고 저장 (빈 줄 정리)
        content_to_save = "".join(new_lines).strip()
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write(content_to_save)
        
        # 2. 파일 이름 복구 (TXT, PDF)
        if txt_path != new_txt_path:
            os.rename(txt_path, new_txt_path)
            
        if os.path.exists(current_pdf_path) and current_pdf_path != new_pdf_path:
            os.rename(current_pdf_path, new_pdf_path)
            
        print(f"✅ 복구 완료: {original_name}")
    else:
        print(f"⚠️ 건너뜀 (원제 정보 없음): {txt_filename}")

print("\n🎉 모든 복구 작업이 완료되었습니다! 맘 편히 배포하세요!")