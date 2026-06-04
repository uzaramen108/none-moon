import os
import json
import bcrypt
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# main.py에서 정의한 변수와 함수를 가져오기 위한 지연 임포트 구조 대신, 
# 가장 깔끔하게 상태를 공유할 수 있도록 설정
router = APIRouter()

class UserAuth(BaseModel):
    nickname: str
    password: str

# 의존성 주입을 위한 전역 변수 (main.py에서 세팅해 줄 예정)
SYNC_FUNC = None
UPLOAD_FUNC = None
LOCAL_DIR_PATH = ""

def get_users_db_path():
    return os.path.join(LOCAL_DIR_PATH, "users.json")

@router.post("/api/signup")
def signup(user: UserAuth):
    if SYNC_FUNC: SYNC_FUNC()
    db_path = get_users_db_path()
    
    users = {}
    if os.path.exists(db_path):
        with open(db_path, "r", encoding="utf-8") as f:
            users = json.load(f)
            
    if user.nickname in users:
        raise HTTPException(status_code=400, detail="이미 존재하는 닉네임입니다.")
        
    # 비밀번호 암호화 (해싱)
    hashed_pw = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    users[user.nickname] = {"password": hashed_pw}
    
    with open(db_path, "w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=4)
        
    if UPLOAD_FUNC: UPLOAD_FUNC(db_path, "users.json")
    return {"status": "success", "message": "회원가입 완료"}

@router.post("/api/login")
def login(user: UserAuth):
    if SYNC_FUNC: SYNC_FUNC()
    db_path = get_users_db_path()
    
    if not os.path.exists(db_path):
        raise HTTPException(status_code=400, detail="가입된 사용자가 없습니다.")
        
    with open(db_path, "r", encoding="utf-8") as f:
        users = json.load(f)
        
    if user.nickname not in users:
        raise HTTPException(status_code=400, detail="존재하지 않는 닉네임입니다.")
        
    # 비밀번호 검증
    stored_hashed_pw = users[user.nickname]["password"].encode('utf-8')
    if not bcrypt.checkpw(user.password.encode('utf-8'), stored_hashed_pw):
        raise HTTPException(status_code=400, detail="비밀번호가 일치하지 않습니다.")
        
    return {"status": "success", "nickname": user.nickname}