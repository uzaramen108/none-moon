import os
import json
import time
from datetime import datetime
# 💡 Form 임포트 추가 (업로드 시 uploader 정보 받기 위함)
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import PlainTextResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from huggingface_hub import HfApi, snapshot_download

# 분리된 로그인/회원가입 모듈 불러오기
import auth

# 1. 앱 초기화 (이게 가장 먼저 와야 NameError가 안 납니다!)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

HF_TOKEN = os.getenv("HF_TOKEN")
# ⚠️ 본인의 데이터셋 주소가 맞는지 확인하세요!
REPO_ID = "uzaramen108/paper-database" 
LOCAL_DIR = "./dataset_cache"

api = HfApi(token=HF_TOKEN)

# 2. 핵심 유틸 함수들
def sync_from_hf():
    try:
        snapshot_download(
            repo_id=REPO_ID, 
            repo_type="dataset", 
            local_dir=LOCAL_DIR, 
            token=HF_TOKEN
        )
    except Exception as e:
        print(f"⚠️ HF 동기화 실패: {e}")

def upload_to_hf(local_path, path_in_repo):
    api.upload_file(
        path_or_fileobj=local_path,
        path_in_repo=path_in_repo,
        repo_id=REPO_ID,
        repo_type="dataset"
    )

# auth 모듈 연동
auth.SYNC_FUNC = sync_from_hf
auth.UPLOAD_FUNC = upload_to_hf
auth.LOCAL_DIR_PATH = LOCAL_DIR

app.include_router(auth.router)

# 최초 실행 시 동기화
sync_from_hf()

# ==========================================
# 3. API 라우터 모음
# ==========================================

@app.get("/api/papers")
def get_papers_list():
    sync_from_hf()
    target_dir = os.path.join(LOCAL_DIR, "resources", "assets", "papers")
    papers_list = []
    if os.path.exists(target_dir):
        for filename in os.listdir(target_dir):
            if filename.endswith(".pdf"):
                papers_list.append(os.path.splitext(filename)[0])
    return sorted(papers_list)

# 💡 신규: management.js에서 사용할 메타데이터(고유ID, 투고자 등) 불러오기
@app.get("/api/papers_meta")
def get_papers_meta():
    sync_from_hf()
    meta_path = os.path.join(LOCAL_DIR, "papers_meta.json")
    if not os.path.exists(meta_path):
        return {}
    with open(meta_path, "r", encoding="utf-8") as f:
        return json.load(f)

@app.get("/api/pdf/{filename}")
def get_pdf_file(filename: str):
    pdf_path = os.path.join(LOCAL_DIR, "resources", "assets", "papers", f"{filename}.pdf")
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF를 찾을 수 없습니다.")
    return FileResponse(pdf_path, media_type="application/pdf")

# 요약본 조회 (JSON 형태로 반환)
@app.get("/api/summary/{filename}")
def get_summary_data(filename: str):
    sync_from_hf()
    sum_path = os.path.join(LOCAL_DIR, "summaries_db.json")
    if not os.path.exists(sum_path):
        return []
    with open(sum_path, "r", encoding="utf-8") as f:
        sum_db = json.load(f)
    return sum_db.get(filename, [])

# 논문 업로드 (투고자 정보 추가 기록)
@app.post("/api/upload")
async def upload_new_paper(file: UploadFile = File(...), uploader: str = Form("알수없음")):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드할 수 있습니다.")
    
    sync_from_hf()
    base_name = os.path.splitext(file.filename)[0]
    
    target_dir = os.path.join(LOCAL_DIR, "resources", "assets", "papers")
    os.makedirs(target_dir, exist_ok=True)
    
    pdf_path = os.path.join(target_dir, f"{base_name}.pdf")
    with open(pdf_path, "wb") as f:
        f.write(await file.read())

    # 메타데이터 업데이트
    meta_path = os.path.join(LOCAL_DIR, "papers_meta.json")
    meta_db = {}
    if os.path.exists(meta_path):
        with open(meta_path, "r", encoding="utf-8") as f:
            meta_db = json.load(f)
            
    if base_name not in meta_db:
        new_id = len(meta_db) + 1
        meta_db[base_name] = {
            "id": new_id,
            "uploader": uploader,
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta_db, f, ensure_ascii=False, indent=4)
        upload_to_hf(meta_path, "papers_meta.json")

    upload_to_hf(pdf_path, f"resources/assets/papers/{base_name}.pdf")
    return {"status": "success"}

# 논문 삭제
@app.delete("/api/paper/{filename}")
def delete_paper(filename: str, requester: str):
    sync_from_hf()
    meta_path = os.path.join(LOCAL_DIR, "papers_meta.json")
    if not os.path.exists(meta_path):
        raise HTTPException(status_code=404)
        
    with open(meta_path, "r", encoding="utf-8") as f:
        meta_db = json.load(f)
        
    if filename not in meta_db:
        raise HTTPException(status_code=404, detail="논문이 존재하지 않습니다.")
        
    if meta_db[filename]["uploader"] != requester:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다. (투고자 본인만 가능)")
        
    del meta_db[filename]
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta_db, f, ensure_ascii=False, indent=4)
    upload_to_hf(meta_path, "papers_meta.json")
    return {"status": "success"}

# 요약본 저장 (4개 제한 및 밀어내기 로직)
class SummaryRequest(BaseModel):
    filename: str
    author: str
    text: str

@app.post("/api/summary/save")
def save_summary(data: SummaryRequest):
    sync_from_hf()
    sum_path = os.path.join(LOCAL_DIR, "summaries_db.json")
    sum_db = {}
    if os.path.exists(sum_path):
        with open(sum_path, "r", encoding="utf-8") as f:
            sum_db = json.load(f)
            
    if data.filename not in sum_db:
        sum_db[data.filename] = []
        
    paper_summaries = sum_db[data.filename]
    existing_idx = next((i for i, s in enumerate(paper_summaries) if s["author"] == data.author), None)
    
    if existing_idx is not None:
        paper_summaries[existing_idx]["text"] = data.text
        paper_summaries[existing_idx]["date"] = datetime.now().strftime("%Y-%m-%d")
    else:
        if len(paper_summaries) >= 4:
            worst_idx = max(range(4), key=lambda i: len(paper_summaries[i].get("needs_revision", [])))
            paper_summaries[worst_idx] = {
                "author": data.author,
                "text": data.text,
                "date": datetime.now().strftime("%Y-%m-%d"),
                "helpful": [],
                "needs_revision": []
            }
        else:
            paper_summaries.append({
                "author": data.author,
                "text": data.text,
                "date": datetime.now().strftime("%Y-%m-%d"),
                "helpful": [],
                "needs_revision": []
            })
            
    with open(sum_path, "w", encoding="utf-8") as f:
        json.dump(sum_db, f, ensure_ascii=False, indent=4)
    upload_to_hf(sum_path, "summaries_db.json")
    return {"status": "success"}

# 피드백(투표) 기능
class VoteRequest(BaseModel):
    filename: str
    target_author: str
    voter: str
    vote_type: str

@app.post("/api/summary/vote")
def vote_summary(data: VoteRequest):
    sync_from_hf()
    sum_path = os.path.join(LOCAL_DIR, "summaries_db.json")
    if not os.path.exists(sum_path):
        raise HTTPException(status_code=404, detail="요약본이 없습니다.")
        
    with open(sum_path, "r", encoding="utf-8") as f:
        sum_db = json.load(f)
        
    for summary in sum_db.get(data.filename, []):
        if summary["author"] == data.target_author:
            if data.voter in summary[data.vote_type]:
                summary[data.vote_type].remove(data.voter)
            else:
                summary[data.vote_type].append(data.voter)
                opposite = "needs_revision" if data.vote_type == "helpful" else "helpful"
                if data.voter in summary[opposite]:
                    summary[opposite].remove(data.voter)
            break
            
    with open(sum_path, "w", encoding="utf-8") as f:
        json.dump(sum_db, f, ensure_ascii=False, indent=4)
    upload_to_hf(sum_path, "summaries_db.json")
    return {"status": "success"}

@app.get("/")
def root():
    return {"message": "논문 대시보드 백엔드 API가 정상 구동 중입니다."}