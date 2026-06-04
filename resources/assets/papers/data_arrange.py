import os

# 스크립트 파일이 위치한 폴더의 절대 경로를 무조건 알아내도록 수정
target_dir = os.path.dirname(os.path.abspath(__file__))

# 남길 파일명의 길이 (예: 앞 8글자만 남김)
max_length = 8

# PDF 파일 목록 가져오기 (파이썬 파일 등 다른 파일은 무시함)
pdf_files = [f for f in os.listdir(target_dir) if f.endswith('.pdf')]
print(f"🔍 총 {len(pdf_files)}개의 PDF 파일을 변환합니다...\n")

for index, filename in enumerate(pdf_files, start=1):
    original_basename = filename[:-4] # '.pdf' 확장자 제거
    
    # 새 파일명 생성: 앞글자 자르기 + 중복 방지 인덱스 추가
    safe_basename = original_basename[:max_length].strip()
    new_basename = f"{safe_basename}_{index:02d}"
    
    old_pdf_path = os.path.join(target_dir, filename)
    new_pdf_path = os.path.join(target_dir, f"{new_basename}.pdf")
    
    old_txt_path = os.path.join(target_dir, f"{original_basename}.txt")
    new_txt_path = os.path.join(target_dir, f"{new_basename}.txt")

    # 1. TXT 파일 내용 수정 및 이름 변경
    txt_content = ""
    if os.path.exists(old_txt_path):
        with open(old_txt_path, 'r', encoding='utf-8') as f:
            txt_content = f.read()
        
        # '원제:'가 이미 추가되어 있지 않은 경우에만 끝에 추가
        if "원제:" not in txt_content:
            txt_content += f"\n\n원제: {original_basename}"
            
        with open(old_txt_path, 'w', encoding='utf-8') as f:
            f.write(txt_content)
            
        os.rename(old_txt_path, new_txt_path)
    else:
        # TXT 파일이 아예 없었다면 새로 생성하면서 원제 삽입
        with open(new_txt_path, 'w', encoding='utf-8') as f:
            f.write(f"[요약본 대기 중]\n\n원제: {original_basename}")

    # 2. PDF 파일 이름 변경
    os.rename(old_pdf_path, new_pdf_path)
    
    print(f"✅ [{index:02d}] 변환 완료: {new_basename}")

print("\n🎉 전처리 완료! 이제 파일 이름 길이 제한 에러 없이 배포하실 수 있습니다.")